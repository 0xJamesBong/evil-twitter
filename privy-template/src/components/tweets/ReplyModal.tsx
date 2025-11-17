"use client";

import { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Avatar,
    Typography,
    Stack,
} from "@mui/material";
import { Close as CloseIcon, Send as SendIcon } from "@mui/icons-material";
import { MockTweet } from "./TweetCard";
import { useSnackbar } from "notistack";

interface ReplyModalProps {
    open: boolean;
    onClose: () => void;
    tweet: MockTweet | null;
}

export function ReplyModal({ open, onClose, tweet }: ReplyModalProps) {
    const { enqueueSnackbar } = useSnackbar();
    const [replyContent, setReplyContent] = useState("");

    if (!tweet) return null;

    const handleReply = () => {
        if (!replyContent.trim()) return;
        enqueueSnackbar(`Reply posted! (Mock - not saved)`, { variant: "success" });
        setReplyContent("");
        onClose();
        // TODO: Call GraphQL mutation
    };

    const handleClose = () => {
        setReplyContent("");
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
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
                        onClick={handleClose}
                        sx={{ minWidth: "auto", p: 1 }}
                    >
                        <CloseIcon />
                    </Button>
                    <Typography variant="h6" sx={{ flexGrow: 1, textAlign: "center" }}>
                        Reply
                    </Typography>
                    <Box sx={{ width: 40 }} /> {/* Spacer for centering */}
                </Box>
            </DialogTitle>

            <DialogContent>
                <Stack spacing={2}>
                    {/* Original Tweet */}
                    <Box sx={{ display: "flex", gap: 2, pb: 2, borderBottom: 1, borderColor: "grey.200" }}>
                        <Avatar
                            src={tweet.author.avatarUrl}
                            sx={{ width: 40, height: 40, bgcolor: "primary.main" }}
                        >
                            {tweet.author.displayName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    {tweet.author.displayName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    @{tweet.author.handle}
                                </Typography>
                            </Stack>
                            <Typography variant="body2">{tweet.content}</Typography>
                        </Box>
                    </Box>

                    {/* Reply Input */}
                    <Box sx={{ display: "flex", gap: 2, pt: 2 }}>
                        <Avatar
                            sx={{ width: 40, height: 40, bgcolor: "primary.main" }}
                        >
                            Y
                        </Avatar>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            placeholder="Tweet your reply"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            variant="outlined"
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                },
                            }}
                        />
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1 }}>
                <Button
                    variant="contained"
                    onClick={handleReply}
                    disabled={!replyContent.trim()}
                    startIcon={<SendIcon />}
                    sx={{
                        borderRadius: "9999px",
                        px: 3,
                    }}
                >
                    Reply
                </Button>
            </DialogActions>
        </Dialog>
    );
}

