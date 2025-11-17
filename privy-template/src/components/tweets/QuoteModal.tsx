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
    Paper,
} from "@mui/material";
import { Close as CloseIcon, Send as SendIcon } from "@mui/icons-material";
import { MockTweet } from "./TweetCard";
import { useSnackbar } from "notistack";

interface QuoteModalProps {
    open: boolean;
    onClose: () => void;
    tweet: MockTweet | null;
}

export function QuoteModal({ open, onClose, tweet }: QuoteModalProps) {
    const { enqueueSnackbar } = useSnackbar();
    const [quoteContent, setQuoteContent] = useState("");

    if (!tweet) return null;

    const handleQuote = () => {
        if (!quoteContent.trim()) return;
        enqueueSnackbar(`Quote tweet posted! (Mock - not saved)`, { variant: "success" });
        setQuoteContent("");
        onClose();
        // TODO: Call GraphQL mutation
    };

    const handleClose = () => {
        setQuoteContent("");
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
                        Quote Tweet
                    </Typography>
                    <Box sx={{ width: 40 }} /> {/* Spacer for centering */}
                </Box>
            </DialogTitle>

            <DialogContent>
                <Stack spacing={2}>
                    {/* Quote Input */}
                    <Box sx={{ display: "flex", gap: 2 }}>
                        <Avatar
                            sx={{ width: 40, height: 40, bgcolor: "primary.main" }}
                        >
                            Y
                        </Avatar>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Add a comment"
                            value={quoteContent}
                            onChange={(e) => setQuoteContent(e.target.value)}
                            variant="outlined"
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                },
                            }}
                        />
                    </Box>

                    {/* Quoted Tweet Preview */}
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            bgcolor: "grey.50",
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
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1 }}>
                <Button
                    variant="contained"
                    onClick={handleQuote}
                    disabled={!quoteContent.trim()}
                    startIcon={<SendIcon />}
                    sx={{
                        borderRadius: "9999px",
                        px: 3,
                    }}
                >
                    Quote
                </Button>
            </DialogActions>
        </Dialog>
    );
}

