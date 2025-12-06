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

interface AnswerModalProps {
    open: boolean;
    onClose: () => void;
    question: TweetNode | null;
    content: string;
    onContentChange: (content: string) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export function AnswerModal({
    open,
    onClose,
    question,
    content,
    onContentChange,
    onSubmit,
    isSubmitting,
}: AnswerModalProps) {
    if (!question) return null;

    const author = question.author;

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
                        Answer Question
                    </Typography>
                    <Box sx={{ width: 40 }} /> {/* Spacer for centering */}
                </Box>
            </DialogTitle>

            <DialogContent>
                <Stack spacing={2}>
                    {/* Answer Input */}
                    <Box sx={{ display: "flex", gap: 2 }}>
                        <Avatar
                            sx={{ width: 40, height: 40, bgcolor: "primary.main" }}
                        >
                            A
                        </Avatar>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            placeholder="Write your answer..."
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

                    {/* Question Preview */}
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            bgcolor: "#181C20",
                            borderRadius: 2,
                            border: 1,
                            borderColor: "rgba(255,255,255,0.06)",
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
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                                        {author?.displayName || "Unknown"}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        @{author?.handle || "unknown"}
                                    </Typography>
                                </Stack>
                                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, color: "text.primary" }}>
                                    Question:
                                </Typography>
                                <Typography variant="body2" sx={{ color: "text.primary" }}>{question.content}</Typography>
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
                    {isSubmitting ? "Posting..." : "Post Answer"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

