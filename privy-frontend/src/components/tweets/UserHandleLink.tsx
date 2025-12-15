"use client";

import { Typography } from "@mui/material";
import { useRouter } from "next/navigation";

interface UserHandleLinkProps {
    handle?: string | null;
    userId?: string | null;
    variant?: "body2" | "caption" | "body1";
    color?: "text.secondary" | "text.primary" | "inherit";
}

export function UserHandleLink({
    handle,
    userId,
    variant = "body2",
    color = "text.secondary",
}: UserHandleLinkProps) {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click from firing
        if (handle) {
            router.push(`/${handle.replace(/^@+/, "")}`);
        } else if (userId) {
            router.push(`/user/${userId}`);
        }
    };

    const displayHandle = handle?.replace(/^@+/, "") || "unknown";

    // Only make clickable if we have a handle or userId
    if (!handle && !userId) {
        return (
            <Typography variant={variant} color={color}>
                @{displayHandle}
            </Typography>
        );
    }

    return (
        <Typography
            variant={variant}
            color={color}
            onClick={handleClick}
            sx={{
                "&:hover": { textDecoration: "underline", cursor: "pointer" },
                display: "inline-block",
            }}
        >
            @{displayHandle}
        </Typography>
    );
}

