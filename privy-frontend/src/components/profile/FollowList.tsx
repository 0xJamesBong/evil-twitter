"use client";

import { useEffect, useMemo } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import {
    Box,
    Typography,
    CircularProgress,
    Stack,
    Avatar,
    Button,
    Alert,
    Divider,
} from "@mui/material";
import { PersonAdd as PersonAddIcon, PersonRemove as PersonRemoveIcon } from "@mui/icons-material";
import Link from "next/link";
import { useFollowStore, FollowUser } from "@/lib/stores/followStore";
import { useFollowUser } from "@/hooks/useFollowUser";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";

interface FollowListProps {
    userId: string;
    type: "followers" | "following";
    title: string;
}

export function FollowList({ userId, type, title }: FollowListProps) {
    const { identityToken } = useIdentityToken();
    const { user: currentUser } = useBackendUserStore();
    const { followUser, unfollowUser, loading: followLoading } = useFollowUser();

    // Select state directly instead of calling methods
    const followersCache = useFollowStore((state) => state.followersCache);
    const followingCache = useFollowStore((state) => state.followingCache);
    const totalCounts = useFollowStore((state) => state.totalCounts);
    const loading = useFollowStore((state) => state.loading);
    const errors = useFollowStore((state) => state.errors);
    const fetchFollowers = useFollowStore((state) => state.fetchFollowers);
    const fetchFollowing = useFollowStore((state) => state.fetchFollowing);
    const updateFollowStatus = useFollowStore((state) => state.updateFollowStatus);

    // Derive values using useMemo to avoid infinite loops
    const followers = useMemo(() => followersCache[userId] || [], [followersCache, userId]);
    const following = useMemo(() => followingCache[userId] || [], [followingCache, userId]);
    const isLoading = useMemo(() => loading[userId]?.[type] || false, [loading, userId, type]);
    const error = useMemo(() => errors[userId]?.[type] || null, [errors, userId, type]);

    const users = type === "followers" ? followers : following;
    const totalCount = useMemo(
        () => totalCounts[userId]?.[type === "followers" ? "followers" : "following"] || 0,
        [totalCounts, userId, type]
    );

    useEffect(() => {
        if (userId && identityToken) {
            if (type === "followers") {
                fetchFollowers(userId, identityToken, 50);
            } else {
                fetchFollowing(userId, identityToken, 50);
            }
        }
    }, [userId, identityToken, type, fetchFollowers, fetchFollowing]);

    const handleFollowToggle = async (targetUserId: string, currentlyFollowing: boolean) => {
        if (!identityToken) return;

        const success = currentlyFollowing
            ? await unfollowUser(targetUserId)
            : await followUser(targetUserId);

        if (success) {
            updateFollowStatus(targetUserId, !currentlyFollowing);
        }
    };

    const cleanHandle = (handle: string) => handle.replace(/^@+/, "");

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200} sx={{ p: 2 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2, minHeight: "100%" }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, position: "sticky", top: 0, bgcolor: "background.paper", zIndex: 1, pb: 1 }}>
                {title} ({totalCount})
            </Typography>

            {users.length === 0 ? (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                        No {type === "followers" ? "followers" : "users being followed"} yet.
                    </Typography>
                </Box>
            ) : (
                <Stack spacing={1}>
                    {users.map((user: FollowUser) => {
                        const isOwnProfile = currentUser?.id === user.id;
                        const isFollowing = user.isFollowedByViewer;

                        return (
                            <Box key={user.id}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        py: 1.5,
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                                        <Link
                                            href={
                                                user.profile?.handle
                                                    ? `/${cleanHandle(user.profile.handle)}`
                                                    : `/user/${user.id}`
                                            }
                                            style={{ textDecoration: "none" }}
                                        >
                                            <Avatar
                                                src={user.profile?.avatarUrl || undefined}
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    bgcolor: "primary.main",
                                                    cursor: "pointer",
                                                    "&:hover": { opacity: 0.8 },
                                                }}
                                            >
                                                {user.profile?.displayName?.charAt(0).toUpperCase() || "U"}
                                            </Avatar>
                                        </Link>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Link
                                                href={
                                                    user.profile?.handle
                                                        ? `/${cleanHandle(user.profile.handle)}`
                                                        : `/user/${user.id}`
                                                }
                                                style={{ textDecoration: "none", color: "inherit" }}
                                            >
                                                <Typography
                                                    variant="subtitle1"
                                                    sx={{
                                                        fontWeight: 600,
                                                        "&:hover": { textDecoration: "underline", cursor: "pointer" },
                                                    }}
                                                >
                                                    {user.profile?.displayName || "Unknown User"}
                                                </Typography>
                                            </Link>
                                            <Link
                                                href={
                                                    user.profile?.handle
                                                        ? `/${cleanHandle(user.profile.handle)}`
                                                        : `/user/${user.id}`
                                                }
                                                style={{ textDecoration: "none", color: "inherit" }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        "&:hover": { textDecoration: "underline", cursor: "pointer" },
                                                    }}
                                                >
                                                    @{user.profile?.handle || "unknown"}
                                                </Typography>
                                            </Link>
                                            {user.profile?.bio && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ mt: 0.5, display: "block" }}
                                                >
                                                    {user.profile.bio}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                    {!isOwnProfile && currentUser && (
                                        <Button
                                            variant={isFollowing ? "outlined" : "contained"}
                                            size="small"
                                            startIcon={isFollowing ? <PersonRemoveIcon /> : <PersonAddIcon />}
                                            onClick={() => handleFollowToggle(user.id, isFollowing)}
                                            disabled={followLoading}
                                            sx={{ ml: 2 }}
                                        >
                                            {isFollowing ? "Unfollow" : "Follow"}
                                        </Button>
                                    )}
                                </Box>
                                <Divider />
                            </Box>
                        );
                    })}
                </Stack>
            )}
        </Box>
    );
}

