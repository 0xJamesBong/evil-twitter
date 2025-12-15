"use client";

import { Avatar } from "@mui/material";
import { useRouter } from "next/navigation";

interface ProfileAvatarProps {
    avatarUrl?: string | null;
    displayName?: string | null;
    handle?: string | null;
    userId?: string | null;
    size?: number;
}

export function AvatarDisc({
    avatarUrl,
    displayName,
    handle,
    userId,
    size = 48,
}: ProfileAvatarProps) {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click from firing
        if (handle) {
            router.push(`/${handle.replace(/^@+/, "")}`);
        } else if (userId) {
            router.push(`/user/${userId}`);
        }
    };

    // Only make clickable if we have a handle or userId
    if (!handle && !userId) {
        return (
            <Avatar
                src={avatarUrl || undefined}
                sx={{
                    width: size,
                    height: size,
                    bgcolor: "primary.main",
                }}
            >
                {displayName?.charAt(0).toUpperCase() || "?"}
            </Avatar>
        );
    }

    return (
        <Avatar
            src={avatarUrl || undefined}
            onClick={handleClick}
            sx={{
                width: size,
                height: size,
                bgcolor: "primary.main",
                cursor: "pointer",
                "&:hover": {
                    opacity: 0.8,
                },
            }}
        >
            {displayName?.charAt(0).toUpperCase() || "?"}
        </Avatar>
    );
}

