"use client";
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
import { TweetNode } from "@/lib/graphql/tweets/types";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { getFontFamilyForLanguageString } from "@/lib/utils/language";

interface QuoteModalProps {
    open: boolean;
    onClose: () => void;
    tweet: TweetNode | null;
    content: string;
    onContentChange: (content: string) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export function QuoteModal({
    open,
    onClose,
    tweet,
    content,
    onContentChange,
    onSubmit,
    isSubmitting,
}: QuoteModalProps) {
    if (!tweet) return null;

    const { user: backendUser } = useBackendUserStore();
    const author = tweet.author;
    
    // Get user's font family based on language preference
    const fontFamily = getFontFamilyForLanguageString(backendUser?.language);

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
                            value={content}
                            onChange={(e) => onContentChange(e.target.value)}
                            variant="outlined"
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    ...(fontFamily && {
                                        "& input, & textarea": {
                                            fontFamily,
                                        },
                                    }),
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
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1 }}>
                <Button
                    variant="contained"
                    onClick={onSubmit}
                    disabled={!content.trim() || isSubmitting}
                    startIcon={<SendIcon />}
                    sx={{
                        borderRadius: "9999px",
                        px: 3,
                    }}
                >
                    {isSubmitting ? "Posting..." : "Quote"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

