import { create } from "zustand";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { ME_QUERY, MeQueryResult } from "../graphql/users/queries";
import {
  ONBOARD_USER_MUTATION,
  OnboardUserResult,
} from "../graphql/users/mutations";
import { graphqlRequest } from "../graphql/client";

type BackendUser = MeQueryResult["me"];

type BackendUserState = {
  user: BackendUser;
  isLoading: boolean;
  error: string | null;
  sessionAuthorityPda: string | null;
  sessionKey: string | null;
  sessionExpiresAt: number | null;
  sessionUserWallet: string | null;
  sessionActive: boolean;
};

type BackendUserActions = {
  // Actions that handle GraphQL calls
  onboardUser: (
    identityToken: string,
    handle: string,
    displayName: string,
    signMessage: (params: {
      message: Uint8Array;
      wallet: any;
      options?: { uiOptions?: { title?: string; description?: string } };
    }) => Promise<{ signature: Uint8Array }>,
    wallet: any
  ) => Promise<void>;
  fetchMe: (identityToken: string) => Promise<void>;
  refreshMe: (identityToken: string) => Promise<void>;
  clear: () => void;
  // Session management
  setSession: (
    sessionAuthorityPda: string,
    sessionKey: string,
    expiresAt: number,
    userWallet: string
  ) => void;
  clearSession: () => void;
  isSessionValid: () => boolean;
};

export const useBackendUserStore = create<
  BackendUserState & BackendUserActions
>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  sessionAuthorityPda: null,
  sessionKey: null,
  sessionExpiresAt: null,
  sessionUserWallet: null,
  sessionActive: false,
  onboardUser: async (
    identityToken: string,
    handle: string,
    displayName: string,
    signMessage: (params: {
      message: Uint8Array;
      wallet: any;
      options?: { uiOptions?: { title?: string; description?: string } };
    }) => Promise<{ signature: Uint8Array }>,
    wallet: any
  ) => {
    set({ isLoading: true, error: null });
    try {
      console.log(
        "Onboarding user with handle:",
        handle,
        "and displayName:",
        displayName
      );

      // Step 1: Generate ephemeral session key
      const sessionKeypair = Keypair.generate();
      const sessionKey = sessionKeypair.publicKey.toBase58();
      console.log("🔑 onboardUser: Generated session key:", sessionKey);

      // Step 2: Create message to sign
      const message = `SESSION:${sessionKey}`;
      const messageBytes = new TextEncoder().encode(message);
      console.log("📝 onboardUser: Message to sign:", message);

      // Step 3: Sign message with user's wallet
      console.log("✍️  onboardUser: Requesting signature from user...");
      const signatureResult = await signMessage({
        message: messageBytes,
        wallet: wallet,
        options: {
          uiOptions: {
            title: "Register Session Key",
            description:
              "Sign this message to register a session key for 30 days",
          },
        },
      });

      // Step 4: Encode signature to base58
      const signatureBytes = signatureResult.signature;
      const signatureBase58 = bs58.encode(signatureBytes);
      console.log(
        "✅ onboardUser: Message signed, signature:",
        signatureBase58.slice(0, 20) + "..."
      );

      // Step 5: Call GraphQL onboardUser mutation with session fields
      // Note: GraphQL uses camelCase, so session_pubkey becomes sessionPubkey
      console.log("📤 onboardUser: Calling GraphQL onboardUser mutation...");
      const data = await graphqlRequest<OnboardUserResult>(
        ONBOARD_USER_MUTATION,
        {
          input: {
            handle,
            displayName,
            sessionPubkey: sessionKey,
            sessionMessage: message,
            sessionSignature: signatureBase58,
          },
        },
        identityToken
      );

      console.log("✅ onboardUser: User onboarded successfully!");

      // Step 6: Store session if returned
      if (data.onboardUser.session) {
        const session = data.onboardUser.session;
        get().setSession(
          session.sessionAuthorityPda,
          session.sessionKey,
          session.expiresAt,
          session.userWallet
        );
        console.log("✅ onboardUser: Session stored in state");
      }

      set({ isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to onboard user",
        isLoading: false,
      });
      throw e;
    }
  },
  fetchMe: async (identityToken: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log("fetchMe | identityToken", identityToken);
      const data = await graphqlRequest<MeQueryResult>(
        ME_QUERY,
        undefined,
        identityToken
      );
      console.log("fetchMe | data", data);
      set({ user: data.me, isLoading: false });
    } catch (e) {
      console.error("fetchMe | error", e);
      set({
        error: e instanceof Error ? e.message : "Failed to fetch user",
        isLoading: false,
      });
      throw e;
    }
  },
  refreshMe: async (identityToken: string) => {
    // Refresh without showing loading state (for polling)
    try {
      const data = await graphqlRequest<MeQueryResult>(
        ME_QUERY,
        undefined,
        identityToken
      );
      set({ user: data.me });
    } catch (e) {
      // Silently fail on refresh to avoid disrupting UX
      console.error("Failed to refresh user data:", e);
    }
  },
  clear: () => {
    set({ user: null, isLoading: false, error: null });
  },
  setSession: (
    sessionAuthorityPda: string,
    sessionKey: string,
    expiresAt: number,
    userWallet: string
  ) => {
    const now = Math.floor(Date.now() / 1000);
    set({
      sessionAuthorityPda,
      sessionKey,
      sessionExpiresAt: expiresAt,
      sessionUserWallet: userWallet,
      sessionActive: expiresAt > now,
    });
  },
  clearSession: () => {
    set({
      sessionAuthorityPda: null,
      sessionKey: null,
      sessionExpiresAt: null,
      sessionUserWallet: null,
      sessionActive: false,
    });
  },
  isSessionValid: () => {
    const state = get();
    if (!state.sessionExpiresAt) return false;
    const now = Math.floor(Date.now() / 1000);
    const isValid = state.sessionExpiresAt > now;
    if (state.sessionActive !== isValid) {
      set({ sessionActive: isValid });
    }
    return isValid;
  },
}));
