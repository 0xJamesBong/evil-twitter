"use client";

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Avatar,
    Typography,
    Stack,
    Paper,
} from "@mui/material";
import { Close as CloseIcon, Repeat as RetweetIcon } from "@mui/icons-material";
import { TweetNode } from "@/lib/graphql/tweets/types";

interface RetweetModalProps {
    open: boolean;
    onClose: () => void;
    tweet: TweetNode | null;
}

export function RetweetModal({ open, onClose, tweet }: RetweetModalProps) {
    if (!tweet) return null;

    const author = tweet.author;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                },
            }}
        >
            <DialogTitle>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Button
                        onClick={onClose}
                        sx={{ minWidth: "auto", p: 1 }}
                    >
                        <CloseIcon />
                    </Button>
                    <Typography variant="h6" sx={{ flexGrow: 1, textAlign: "center" }}>
                        Retweet
                    </Typography>
                    <Box sx={{ width: 40 }} /> {/* Spacer for centering */}
                </Box>
            </DialogTitle>

            <DialogContent>
                <Stack spacing={2}>
                    {/* Tweet to Retweet */}
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            bgcolor: "background.paper",
                            borderRadius: 2,
                            border: 1,
                            borderColor: "grey.300",
                        }}
                    >
                        <Box sx={{ display: "flex", gap: 2 }}>
                            <Avatar
                                src={author?.avatarUrl || undefined}
                                sx={{ width: 40, height: 40, bgcolor: "primary.main" }}
                            >
                                {author?.displayName?.charAt(0).toUpperCase() || "?"}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        {author?.displayName || "Unknown"}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        @{author?.handle || "unknown"}
                                    </Typography>
                                </Stack>
                                <Typography variant="body2">{tweet.content}</Typography>
                            </Box>
                        </Box>
                    </Paper>

                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                        Retweet this to your followers?
                    </Typography>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1, justifyContent: "center" }}>
                <Button
                    variant="contained"
                    onClick={onClose}
                    startIcon={<RetweetIcon />}
                    sx={{
                        borderRadius: "9999px",
                        px: 4,
                    }}
                >
                    Retweet
                </Button>
            </DialogActions>
        </Dialog>
    );
}

