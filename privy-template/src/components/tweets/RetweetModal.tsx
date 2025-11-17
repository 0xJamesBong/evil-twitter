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
import { MockTweet } from "./TweetCard";
import { useSnackbar } from "notistack";

interface RetweetModalProps {
    open: boolean;
    onClose: () => void;
    tweet: MockTweet | null;
}

export function RetweetModal({ open, onClose, tweet }: RetweetModalProps) {
    const { enqueueSnackbar } = useSnackbar();

    if (!tweet) return null;

    const handleRetweet = () => {
        enqueueSnackbar(`Retweeted @${tweet.author.handle}`, { variant: "success" });
        onClose();
        // TODO: Call GraphQL mutation
    };

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
                    </Paper>

                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                        Retweet this to your followers?
                    </Typography>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1, justifyContent: "center" }}>
                <Button
                    variant="contained"
                    onClick={handleRetweet}
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

