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
} from "@mui/material";
import { Close as CloseIcon, Send as SendIcon } from "@mui/icons-material";
import { TweetNode } from "@/lib/graphql/tweets/types";

interface ReplyModalProps {
    open: boolean;
    onClose: () => void;
    tweet: TweetNode | null;
    content: string;
    onContentChange: (content: string) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export function ReplyModal({
    open,
    onClose,
    tweet,
    content,
    onContentChange,
    onSubmit,
    isSubmitting,
}: ReplyModalProps) {
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
                        Reply
                    </Typography>
                    <Box sx={{ width: 40 }} /> {/* Spacer for centering */}
                </Box>
            </DialogTitle>

            <DialogContent>
                <Stack spacing={2}>
                    {/* Original Tweet */}
                    <Box sx={{ display: "flex", gap: 2, pb: 2, borderBottom: 1, borderColor: "rgba(255,255,255,0.06)" }}>
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
                            value={content}
                            onChange={(e) => onContentChange(e.target.value)}
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
                    onClick={onSubmit}
                    disabled={!content.trim() || isSubmitting}
                    startIcon={<SendIcon />}
                    sx={{
                        borderRadius: "9999px",
                        px: 3,
                    }}
                >
                    {isSubmitting ? "Posting..." : "Reply"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

