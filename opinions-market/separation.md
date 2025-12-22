Here’s the **clean separation doctrine** you should adopt, given your current codebase and intent to split the “fed” from the “opinions market.”

I’ll be blunt: right now your programs are entangled because you’ve let **token accounting and economic logic bleed into your post/voting logic**. The split is not “what is convenient,” but “what must be sovereign.”

---

# ✂️ PRINCIPLE OF SEPARATION

**Fed program = custody, money, accounting, token conversions, fees, vaults.**
**Opinions Market program = post lifecycle, votes, settlement math, post relations, positions.**

The Opinions Market should never hold custody.
The Fed should never know anything about posts.

---

# ✔️ WHAT GOES INTO THE FED

(think: central bank, vault, clearing house)

### 🟦 Token & Vault Ownership

- user vault token accounts
- locked vs unlocked balances
- vault authority PDA seeds
- program vault semantics
- mint registry & valid payments
- token conversion logic (BLING ↔ alternative tokens)

### 🟦 Monetary Operations

- charge_vote(...)
- charge_tip(...)
- transfer creator fees
- transfer protocol fees
- distribute referral bonuses
- token withdrawals rules
- escrow mechanics
- pot token account creation and ownership

### 🟦 CPI Entry Points

The Opinions Market should _only_ call CPIs like:

```
fed::cpi::charge_vote(...)
fed::cpi::settlement_payout(...)
fed::cpi::creator_fee(...)
fed::cpi::protocol_fee(...)
```

### 🟦 Enforcement of Monetary Policy

- fee BPS definitions
- withdrawal enable/disable
- locked token logic
- stablecoin vs BLING registry
- alternative payments registration

### 🟦 Identity / Session

Actually belongs in Persona, not Fed.
Fed should rely on persona for auth checks.

### Summary

Fed controls:

- WHO can spend
- HOW MUCH they spend
- WHAT TOKEN is spent
- WHERE tokens go

Fed NEVER knows:

- why they spent
- who won
- which side they voted on
- post ID semantics

---

# ✔️ WHAT GOES INTO THE OPINIONS MARKET

(think: game logic & math, no custody)

### 🟩 Post Lifecycle

- create root post
- create replies/answers
- state transitions: Open → Settled
- timestamps
- parent/child relations

### 🟩 Vote Logic

- pump/smack side tally
- scoring math
- position tracking per user
- overflow protections
- post time extension rules

### 🟩 Settlement Math

- determining winning side
- calculating:

  - mother fee
  - protocol fee
  - creator fee
  - payout_per_vote

### 🟩 Storage / PDAs

- PostAccount
- UserPostPosition
- PostMintPayout
- Claim accounts

### 🟩 CPI Hooks Only for Money

Replace your panics:

```rust
panic!("SPL transfers must go through Fed");
```

with:

```rust
fed::cpi::charge_vote(...)
fed::cpi::settle(...)
fed::cpi::distribute(...)
```

### Opinions Market owns:

- logic
- math
- state
- invariants

**BUT NEVER TOKENS.**

---

# 🚫 WHAT MUST BE REMOVED FROM OPINIONS MARKET

Currently your Opinions Market illegally handles:

- `anchor_spl::token::transfer`
- vault authority
- token_mint handling
- alternative payment conversion logic
- treasury accounts

ALL OF THAT moves to Fed.

Your Opinions Market should only _specify amounts_ and _call the Fed_ to perform transfers.

---

# 🧱 CLEAN SEPARATION EXAMPLE

### Voting flow once separated:

```
vote_on_post():
    math ← OM
    validate ← OM
    cost = compute_cost()

    fed::charge_vote(cost, voter, post_pot, protocol_treasury)
    update position
    update counters
```

### Settlement flow:

```
settle_post():
    compute fees ← OM
    freeze payout ← OM

distribute_protocol_fee():
    fed::transfer(protocol_fee)

claim_post_reward():
    fed::payout_reward(vault, reward)
```

The OM computes amounts.
The Fed moves tokens.

---

# 🗂️ Program Responsibilities Table

| Concern              | Fed      | Opinions Market       |
| -------------------- | -------- | --------------------- |
| user vaults          | ✅       | ❌                    |
| token transfers      | ✅       | ❌                    |
| BLING mint registry  | ✅       | ❌                    |
| tipping & sending    | ✅       | ❌                    |
| vote cost calc       | ❌       | ✅                    |
| pump/smack tally     | ❌       | ✅                    |
| post creation        | ❌       | ✅                    |
| post settlement math | ❌       | ✅                    |
| session/auth         | persona  | persona               |
| protocol fee BPS     | Fed      | read-only constant    |
| pot token accounts   | Fed owns | OM references via PDA |
| referral             | Fed      | ❌                    |

---

# 🧠 TL;DR

**Opinions Market = brains**
**Fed = bank**

Your Opinions Market must become:

- stateless with respect to tokens
- pure math
- post state machine

Your Fed must become:

- single source of truth for balances
- enforcement of token rules
- CPI target for anything involving SPL-token

---

# Why this is the correct architecture

1. Fed can be audited independently.
2. Opinions Market becomes upgradable without touching custody.
3. You can add more games (prediction market, bounties, lotteries) that reuse the Fed.
4. Token policy changes don’t require redeployment of game logic.
5. Security perimeter shrinks—Fed becomes the only target for token exploits.

This is exactly how:

- Serum vs SPL Token
- Metaplex vs auction houses
- Jupiter vs token vaults

are separated.

---

# If you want, I’ll next:

- propose folder structure
- design CPI interfaces
- extract token ownership out of your current code
- create Fed PDA schema

Just ask.

But the separation lines above are the canonical ones.
