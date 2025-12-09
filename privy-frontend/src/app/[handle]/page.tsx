"use client";

import { useParams } from "next/navigation";
import { UserProfile } from "@/components/profile/UserProfile";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { useUserByHandle } from "@/hooks/useUserByHandle";

export default function ProfileByHandlePage() {
    const params = useParams();
    const rawHandle = params.handle as string;
    // Strip "@" prefix if present (handle should not include @)
    const handle = rawHandle?.startsWith("@") ? rawHandle.slice(1) : rawHandle;
    const { user: currentUser } = useBackendUserStore();
    const { user, loading, error, refetch } = useUserByHandle(handle, 20);

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

