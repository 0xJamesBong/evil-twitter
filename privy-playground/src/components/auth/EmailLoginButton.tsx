"use client";

import { usePrivy } from "@privy-io/react-auth";

export function EmailLoginButton() {
    const { login } = usePrivy();

    const handleEmailLogin = () => {
        // Open Privy modal with email login
        login();
    };

    return (
        <button
            className="bg-white text-brand-off-black w-full max-w-md rounded-full px-4 py-2 hover:bg-gray-100 lg:px-8 lg:py-4 lg:text-xl"
            onClick={handleEmailLogin}
        >
            Continue with Email
        </button>
    );
}

