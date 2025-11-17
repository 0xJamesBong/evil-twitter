"use client";

import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { ToastContainer } from "react-toastify";

import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
import { Header } from "@/components/ui/header";
import CreateAWallet from "@/components/sections/create-a-wallet";
import UserObject from "@/components/sections/user-object";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";
import FundWallet from "@/components/sections/fund-wallet";
import LinkAccounts from "@/components/sections/link-accounts";
import UnlinkAccounts from "@/components/sections/unlink-accounts";
import WalletActions from "@/components/sections/wallet-actions";
import SessionSigners from "@/components/sections/session-signers";
import WalletManagement from "@/components/sections/wallet-management";
import MFA from "@/components/sections/mfa";
import { SyncPrivy } from "@/components/auth/SyncPrivy";

import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { usePingStore } from "@/lib/stores/pingStore";
import { API_BASE_URL } from "../lib/config";

function Home() {
  const { ready, authenticated, logout, login, user: privyUser } = usePrivy();
  const { user: backendUser, isLoading, error } = useBackendUserStore();
  const { ping, response, isLoading: isPinging, error: pingError } = usePingStore();

  console.log("Home, backendUser:", backendUser);
  console.log("Home, privyUser:", privyUser);
  console.log("API_BASE_URL: ", API_BASE_URL);
  if (!ready) {
    return <FullScreenLoader />;
  }

  return (
    <div className="bg-[#E0E7FF66] md:max-h-[100vh] md:overflow-hidden">
      <Header />
      {authenticated ? (

        <section className="w-full flex flex-col md:flex-row md:h-[calc(100vh-60px)]">
          <div className="flex-grow overflow-y-auto h-full p-4 pl-8">
            <button className="button" onClick={logout}>
              <ArrowLeftIcon className="h-4 w-4" strokeWidth={2} /> Logout
            </button>

            <div>
              <div className="mb-4 p-4 bg-white rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Backend Connection Test</h3>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                  onClick={ping}
                  disabled={isPinging}
                >
                  {isPinging ? "Pinging..." : "Ping Backend"}
                </button>
                {response && (
                  <div className="mt-2 p-2 bg-green-100 rounded">
                    <strong>Response:</strong> {response}
                  </div>
                )}
                {pingError && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-red-700">
                    <strong>Error:</strong> {pingError}
                  </div>
                )}
              </div>

              {/* User Data Display */}
              <div className="mb-4 p-4 bg-white rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">User Data</h3>

                {/* Privy User Data */}
                <div className="mb-4">
                  <h4 className="text-md font-semibold mb-2 text-blue-600">Privy User Data</h4>
                  <div className="bg-gray-50 p-3 rounded border overflow-auto max-h-96">
                    <pre className="text-xs whitespace-pre-wrap break-words">
                      {privyUser ? JSON.stringify(privyUser, null, 2) : "No Privy user data (not authenticated)"}
                    </pre>
                  </div>
                </div>

                {/* Backend User Data */}
                <div>
                  <h4 className="text-md font-semibold mb-2 text-green-600">Backend User Data</h4>
                  {isLoading && (
                    <div className="text-sm text-gray-500 mb-2">Loading backend user...</div>
                  )}
                  {error && (
                    <div className="text-sm text-red-500 mb-2">Error: {error}</div>
                  )}
                  <div className="bg-gray-50 p-3 rounded border overflow-auto max-h-96">
                    <pre className="text-xs whitespace-pre-wrap break-words">
                      {backendUser ? JSON.stringify(backendUser, null, 2) : "No backend user data (not onboarded)"}
                    </pre>
                  </div>
                </div>
              </div>

              {/* <SyncPrivy /> */}
              <CreateAWallet />
              <FundWallet />
              <LinkAccounts />
              <UnlinkAccounts />
              <WalletActions />
              <SessionSigners />
              <WalletManagement />
              <MFA />
            </div>
          </div>
          <UserObject />
        </section>
      ) : (
        <section className="w-full flex flex-row justify-center items-center h-[calc(100vh-60px)] relative">
          <Image
            src="./BG.svg"
            alt="Background"
            fill
            style={{ objectFit: "cover", zIndex: 0 }}
            priority
          />
          <div className="z-10 flex flex-col items-center justify-center w-full h-full">
            <div className="flex h-10 items-center justify-center rounded-[20px] border border-white px-6 text-lg text-white font-abc-favorit">
              Next.js Demo
            </div>
            <div className="text-center mt-4 text-white text-7xl font-medium font-abc-favorit leading-[81.60px]">
              EVIL TWITTER
            </div>
            <div className="text-center text-white text-xl font-normal leading-loose mt-8">
              Try to create an account with privy and put it in our backend
            </div>
            <button
              className="bg-white text-brand-off-black mt-15 w-full max-w-md rounded-full px-4 py-2 hover:bg-gray-100 lg:px-8 lg:py-4 lg:text-xl"
              onClick={() => {
                login();
                setTimeout(() => {
                  (document.querySelector('input[type="email"]') as HTMLInputElement)?.focus();
                }, 150);
              }}
            >
              login
            </button>
          </div>
        </section>
      )}

      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable={false}
        pauseOnHover
        limit={1}
        aria-label="Toast notifications"
        style={{ top: 58 }}
      />
    </div>
  );
}

export default Home;
