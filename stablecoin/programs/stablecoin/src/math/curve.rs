pub struct StableSwapMath;

impl StableSwapMath {
    /// Compute D invariant
    pub fn compute_d(balances: &[u128], amp: u128) -> u128 {
        let n_coins = balances.len() as u128;

        // Sum of all balances
        let mut sum_x = 0u128;
        for &x in balances {
            sum_x += x;
        }
        if sum_x == 0 {
            return 0;
        }

        // Initial guess for D
        let mut d_prev: u128;
        let mut d = sum_x;

        // A * n^n
        let ann = amp * n_coins.pow(n_coins as u32);

        // Newton iteration
        for _ in 0..255 {
            let mut d_p = d;

            for &x in balances {
                d_p = d_p * d / (x * n_coins);
            }

            d_prev = d;

            // Numerator:
            // ann * sum_x + d_p * n_coins
            let numerator = (ann * sum_x + d_p * n_coins) * d;

            // Denominator:
            // (ann - 1) * d + (n_coins + 1) * d_p
            let denominator = (ann - 1) * d + (n_coins + 1) * d_p;

            d = numerator / denominator;

            if d > d_prev {
                if d - d_prev <= 1 {
                    break;
                }
            } else if d_prev - d <= 1 {
                break;
            }
        }

        d
    }

    /// Solve for y_j: the balance of coin j after a swap that preserves D
    pub fn get_y(i: usize, j: usize, x_i_new: u128, balances: &[u128], amp: u128) -> u128 {
        let n_coins = balances.len() as u128;

        // Copy balances, update coin i with new-x
        let mut c_bal = balances.to_vec();
        c_bal[i] = x_i_new;

        // Compute D invariant
        let d = Self::compute_d(&c_bal, amp);

        // Calculate 'c' and 'b' coefficients for solving balance j
        let ann = amp * n_coins.pow(n_coins as u32);

        let mut s = 0u128;
        let mut c = d;
        for (index, &x) in c_bal.iter().enumerate() {
            if index == j {
                continue;
            }
            s += x;
            c = c * d / (x * n_coins);
        }

        c = c * d / (ann * n_coins.pow(n_coins as u32));

        let b = s + d / ann;

        // Newton iteration for y
        let mut y_prev;
        let mut y = d;

        for _ in 0..255 {
            y_prev = y;

            // y_{k+1} = (y^2 + c) / (2*y + b - d)
            let numerator = y * y + c;
            let denominator = 2 * y + b - d;

            y = numerator / denominator;

            if y > y_prev {
                if y - y_prev <= 1 {
                    break;
                }
            } else if y_prev - y <= 1 {
                break;
            }
        }

        y
    }

    /// amount_out = old_balance_j - y_j
    pub fn get_amount_out(i: usize, j: usize, dx: u128, balances: &[u128], amp: u128) -> u128 {
        let x_i_new = balances[i] + dx;
        let y = Self::get_y(i, j, x_i_new, balances, amp);
        balances[j].saturating_sub(y)
    }
}

// cargo test --lib curve -- --nocapture
#[cfg(test)]
mod tests {
    use super::*;

    fn almost_equal(a: u128, b: u128, tolerance: u128) -> bool {
        if a > b {
            a - b <= tolerance
        } else {
            b - a <= tolerance
        }
    }

    #[test]
    fn test_compute_d_three_coins_balanced() {
        let balances = vec![1_000_000_000u128, 1_000_000_000u128, 1_000_000_000u128];
        let amp = 1000u128;

        let d = StableSwapMath::compute_d(&balances, amp);

        // For balanced 3-coins: D ≈ 3 * each_balance
        let expected = 3_000_000_000u128;
        assert!(almost_equal(d, expected, 10));
    }

    #[test]
    fn test_compute_d_unbalanced() {
        let balances = vec![2_000_000_000u128, 1_000_000_000u128, 500_000_000u128];
        let amp = 1000u128;

        let d = StableSwapMath::compute_d(&balances, amp);
        assert!(d > 0);
        assert!(d > balances.iter().sum::<u128>()); // D > sum(x)
    }

    #[test]
    fn test_get_y_symmetric_pool() {
        let balances = vec![1_000_000_000u128, 1_000_000_000u128, 1_000_000_000u128];
        let amp = 1000u128;

        // Swap token 0 → token 1, add dx:
        let dx = 100_000_000u128;
        let new_x = balances[0] + dx;

        let y = StableSwapMath::get_y(0, 1, new_x, &balances, amp);

        // New y should be slightly smaller because we get some out.
        assert!(y < balances[1]);
    }

    #[test]
    fn test_swap_amount_out_basic() {
        let balances = vec![1_000_000_000u128, 1_000_000_000u128];
        let amp = 1000u128;

        let dx = 100_000_000u128; // deposit 0.1 into token 0
        let out = StableSwapMath::get_amount_out(0, 1, dx, &balances, amp);

        assert!(out > 95_000_000u128); // Should be near dx
        assert!(out < 100_000_000u128); // Should not be more than dx
    }

    #[test]
    fn test_invariant_preserved_after_swap() {
        let mut balances = vec![1_000_000_000u128, 1_000_000_000u128, 1_000_000_000u128];
        let amp = 1000u128;

        let d_before = StableSwapMath::compute_d(&balances, amp);

        // Perform swap: token 0 → 1
        let dx = 100_000_000u128;
        let out = StableSwapMath::get_amount_out(0, 1, dx, &balances, amp);

        balances[0] += dx;
        balances[1] -= out;

        let d_after = StableSwapMath::compute_d(&balances, amp);

        // The invariant is numerically stable but not identical.
        assert!(almost_equal(d_before, d_after, d_before / 10_000)); // 0.01% tolerance
    }

    #[test]
    fn test_slippage_monotonicity() {
        let balances = vec![1_000_000_000u128, 1_000_000_000u128];
        let amp = 1000u128;

        let small_dx = 10_000_000u128;
        let large_dx = 200_000_000u128;

        let out_small = StableSwapMath::get_amount_out(0, 1, small_dx, &balances, amp);
        let out_large = StableSwapMath::get_amount_out(0, 1, large_dx, &balances, amp);

        // You should get worse price for a larger trade.
        assert!(out_large < out_small * 20); // strictly less per-unit output
    }
}
