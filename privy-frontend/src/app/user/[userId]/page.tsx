"use client";

import { useParams } from "next/navigation";
import { UserProfile } from "@/components/profile/UserProfile";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { useUserById } from "@/hooks/useUserById";

export default function ProfileByIdPage() {
    const params = useParams();
    const userId = params.userId as string;
    const { user: currentUser } = useBackendUserStore();
    const { user, loading, error, refetch } = useUserById(userId, 20);

    const isOwnProfile = currentUser?.id === user?.id;

    return (
        <UserProfile
            user={user}
            loading={loading}
            error={error}
            isOwnProfile={isOwnProfile}
            onRefresh={refetch}
        />
    );
}

