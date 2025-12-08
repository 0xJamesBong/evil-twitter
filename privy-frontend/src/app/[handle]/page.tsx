"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useIdentityToken } from "@privy-io/react-auth";
import { graphqlRequest } from "@/lib/graphql/client";
import {
    USER_BY_HANDLE_QUERY,
    UserByHandleResult,
} from "@/lib/graphql/users/queries";
import { UserProfile } from "@/components/profile/UserProfile";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";

export default function ProfileByHandlePage() {
    const params = useParams();
    const rawHandle = params.handle as string;
    // Strip "@" prefix if present (handle should not include @)
    const handle = rawHandle?.startsWith("@") ? rawHandle.slice(1) : rawHandle;
    const { identityToken } = useIdentityToken();
    const { user: currentUser } = useBackendUserStore();
    const [user, setUser] = useState<UserByHandleResult["userByHandle"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            if (!handle) {
                setError("Handle is required");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const data = await graphqlRequest<UserByHandleResult>(
                    USER_BY_HANDLE_QUERY,
                    { handle, first: 20 },
                    identityToken || undefined
                );

                if (data.userByHandle) {
                    setUser(data.userByHandle);
                } else {
                    setError("User not found");
                }
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to fetch user";
                setError(errorMessage);
                console.error("Failed to fetch user by handle:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [handle, identityToken]);

    const isOwnProfile = currentUser?.id === user?.id;

    const handleRefresh = async () => {
        if (!handle) return;

        try {
            const data = await graphqlRequest<UserByHandleResult>(
                USER_BY_HANDLE_QUERY,
                { handle, first: 20 },
                identityToken || undefined
            );

            if (data.userByHandle) {
                setUser(data.userByHandle);
            }
        } catch (err) {
            console.error("Failed to refresh user:", err);
        }
    };

    return (
        <UserProfile
            user={user}
            loading={loading}
            error={error}
            isOwnProfile={isOwnProfile}
            onRefresh={handleRefresh}
        />
    );
}

