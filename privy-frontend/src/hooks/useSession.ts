import { useBackendUserStore } from "@/lib/stores/backendUserStore";

/**
 * Hook to check session status and get session data
 * Returns session information if active and valid
 */
export function useSession() {
  const {
    sessionAuthorityPda,
    sessionExpiresAt,
    sessionActive,
    isSessionValid,
  } = useBackendUserStore();

  const active = isSessionValid();

  return {
    active,
    sessionAuthorityPda: active ? sessionAuthorityPda : null,
    expiresAt: active ? sessionExpiresAt : null,
  };
}
