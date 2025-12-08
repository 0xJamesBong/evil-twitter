"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useIdentityToken } from "@privy-io/react-auth";
import { graphqlRequest } from "@/lib/graphql/client";
import {
    USER_BY_ID_QUERY,
    UserByIdResult,
} from "@/lib/graphql/users/queries";
import { UserProfile } from "@/components/profile/UserProfile";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";

export default function ProfileByIdPage() {
    const params = useParams();
    const userId = params.userId as string;
    const { identityToken } = useIdentityToken();
    const { user: currentUser } = useBackendUserStore();
    const [user, setUser] = useState<UserByIdResult["user"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            if (!userId) {
                setError("User ID is required");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const data = await graphqlRequest<UserByIdResult>(
                    USER_BY_ID_QUERY,
                    { id: userId, first: 20 },
                    identityToken || undefined
                );

                if (data.user) {
                    setUser(data.user);
                } else {
                    setError("User not found");
                }
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to fetch user";
                setError(errorMessage);
                console.error("Failed to fetch user by ID:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [userId, identityToken]);

    const isOwnProfile = currentUser?.id === user?.id;

    const handleRefresh = async () => {
        if (!userId) return;

        try {
            const data = await graphqlRequest<UserByIdResult>(
                USER_BY_ID_QUERY,
                { id: userId, first: 20 },
                identityToken || undefined
            );

            if (data.user) {
                setUser(data.user);
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

