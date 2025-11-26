"use client";

import { useState, useEffect } from "react";
import { useSolanaWallets } from "@privy-io/react-auth";
import { PublicKey } from "@solana/web3.js";
import { useSnackbar } from "notistack";
import { useDeposit } from "../../hooks/useDeposit";
import { useWithdraw } from "../../hooks/useWithdraw";
import { getConnection } from "../../lib/solana/connection";
import { getUserVaultTokenAccountPda } from "../../lib/solana/pda";

const PROGRAM_ID = new PublicKey("4z5rjroGdWmgGX13SdFsh4wRM4jJkMUrcvYrNpV3gezm");

// Default BLING mint - should match backend
const BLING_MINT = new PublicKey("bbb9w3ZidNJJGm4TKbhkCXqB9XSnzsjTedmJ5F2THX8");

interface DepositWithdrawProps {
  tokenMint?: PublicKey;
}

export function DepositWithdraw({ tokenMint = BLING_MINT }: DepositWithdrawProps) {
  const { wallets } = useSolanaWallets();
  const solanaWallet = wallets.find((w) => w.walletClientType === "privy");
  const { deposit, loading: depositLoading, error: depositError } = useDeposit();
  const { withdraw, loading: withdrawLoading, error: withdrawError } = useWithdraw();
  const { enqueueSnackbar } = useSnackbar();

  const [amount, setAmount] = useState<string>("");
  const [vaultBalance, setVaultBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Fetch vault balance
  const fetchVaultBalance = async () => {
    if (!solanaWallet?.publicKey) {
      setVaultBalance(null);
      return;
    }

    setLoadingBalance(true);
    try {
      const connection = getConnection();
      const [vaultTokenAccountPda] = getUserVaultTokenAccountPda(
        PROGRAM_ID,
        solanaWallet.publicKey,
        tokenMint
      );

      const accountInfo = await connection.getAccountInfo(vaultTokenAccountPda);
      if (accountInfo && accountInfo.data.length >= 72) {
        // Token account amount is at offset 64 (8 bytes, little-endian)
        const amountBytes = accountInfo.data.slice(64, 72);
        // Convert Uint8Array to BigInt (little-endian)
        let balance = 0n;
        for (let i = 0; i < 8; i++) {
          balance += BigInt(amountBytes[i]) << BigInt(i * 8);
        }
        setVaultBalance(Number(balance));
      } else {
        setVaultBalance(0);
      }
    } catch (error) {
      console.error("Failed to fetch vault balance:", error);
      setVaultBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchVaultBalance();
  }, [solanaWallet?.publicKey, tokenMint]);

  const handleDeposit = async () => {
    if (!solanaWallet) {
      enqueueSnackbar("No Solana wallet connected", { variant: "error" });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      enqueueSnackbar("Please enter a valid amount", { variant: "error" });
      return;
    }

    try {
      const signature = await deposit(amountNum, tokenMint);
      enqueueSnackbar(`Deposit successful! Transaction: ${signature.slice(0, 8)}...`, { variant: "success" });
      setAmount("");
      // Refresh balance after deposit
      setTimeout(() => fetchVaultBalance(), 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to deposit";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  const handleWithdraw = async () => {
    if (!solanaWallet) {
      enqueueSnackbar("No Solana wallet connected", { variant: "error" });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      enqueueSnackbar("Please enter a valid amount", { variant: "error" });
      return;
    }

    if (vaultBalance !== null && amountNum > vaultBalance) {
      enqueueSnackbar("Insufficient vault balance", { variant: "error" });
      return;
    }

    try {
      const signature = await withdraw(amountNum, tokenMint);
      enqueueSnackbar(`Withdraw successful! Transaction: ${signature.slice(0, 8)}...`, { variant: "success" });
      setAmount("");
      // Refresh balance after withdraw
      setTimeout(() => fetchVaultBalance(), 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to withdraw";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  if (!solanaWallet) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-gray-600">Please connect a Solana wallet to deposit or withdraw.</p>
      </div>
    );
  }

  const isLoading = depositLoading || withdrawLoading || loadingBalance;

  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm">
      <h2 className="text-xl font-bold mb-4">Deposit / Withdraw</h2>

      {/* Vault Balance Display */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Vault Balance:</span>
          <span className="text-lg font-semibold">
            {loadingBalance ? (
              <span className="text-gray-400">Loading...</span>
            ) : vaultBalance !== null ? (
              vaultBalance.toLocaleString()
            ) : (
              <span className="text-gray-400">N/A</span>
            )}
          </span>
        </div>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Amount
        </label>
        <input
          id="amount"
          type="number"
          min="0"
          step="0.000000001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDeposit}
          disabled={isLoading || !amount}
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {depositLoading ? "Depositing..." : "Deposit"}
        </button>
        <button
          onClick={handleWithdraw}
          disabled={isLoading || !amount}
          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {withdrawLoading ? "Withdrawing..." : "Withdraw"}
        </button>
      </div>

      {/* Error Messages */}
      {depositError && (
        <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded">
          Deposit error: {depositError}
        </div>
      )}
      {withdrawError && (
        <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded">
          Withdraw error: {withdrawError}
        </div>
      )}
    </div>
  );
}

