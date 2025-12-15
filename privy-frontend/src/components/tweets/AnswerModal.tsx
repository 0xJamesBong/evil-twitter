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
    IconButton,
    Divider,
} from "@mui/material";
import { Close as CloseIcon, Send as SendIcon, FormatBold as FormatBoldIcon, Image as ImageIcon, Info as InfoIcon } from "@mui/icons-material";
import { TweetNode } from "@/lib/graphql/tweets/types";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { getFontFamilyForLanguageString } from "@/lib/utils/language";

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

    const { user: backendUser } = useBackendUserStore();
    const author = question.author;

    // Get user's font family based on language preference
    const fontFamily = getFontFamilyForLanguageString(backendUser?.language);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    bgcolor: "background.paper",
                },
            }}
        >
            {/* Header with close button */}
            <Box sx={{ position: "relative", p: 2, pb: 1 }}>
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: "absolute",
                        left: 8,
                        top: 8,
                        color: "text.secondary",
                        "&:hover": {
                            bgcolor: "action.hover",
                        },
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>

            <DialogContent sx={{ px: 3, pt: 0 }}>
                <Stack spacing={3}>

                    {/* Question Display */}
                    <Box>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 600,
                                color: "text.primary",
                                lineHeight: 1.4,
                                mb: 2,
                            }}
                        >
                            {question.content}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                            <Avatar
                                src={author?.avatarUrl || undefined}
                                sx={{ width: 32, height: 32, bgcolor: "primary.main" }}
                            >
                                {author?.displayName?.charAt(0).toUpperCase() || "?"}
                            </Avatar>
                            <Typography variant="body2" color="text.secondary">
                                {author?.displayName || "Unknown"}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Answer Input */}
                    <Box>
                        <TextField
                            fullWidth
                            multiline
                            minRows={8}
                            placeholder="Write your answer"
                            value={content}
                            onChange={(e) => onContentChange(e.target.value)}
                            variant="standard"
                            InputProps={{
                                disableUnderline: true,
                            }}
                            sx={{
                                "& .MuiInputBase-root": {
                                    fontSize: "1rem",
                                    ...(fontFamily && {
                                        fontFamily,
                                    }),
                                },
                                "& .MuiInputBase-input": {
                                    py: 2,
                                    minHeight: "200px",
                                },
                            }}
                        />
                    </Box>

                    {/* Formatting tools and info */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <IconButton
                                size="small"
                                sx={{
                                    color: "text.secondary",
                                    "&:hover": {
                                        bgcolor: "action.hover",
                                    },
                                }}
                            >
                                <FormatBoldIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                sx={{
                                    color: "text.secondary",
                                    "&:hover": {
                                        bgcolor: "action.hover",
                                    },
                                }}
                            >
                                <ImageIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                            No answer yet
                        </Typography>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, pt: 2, justifyContent: "space-between" }}>
                <Button
                    variant="text"
                    startIcon={<InfoIcon />}
                    sx={{
                        textTransform: "none",
                        color: "text.secondary",
                        "&:hover": {
                            bgcolor: "action.hover",
                        },
                    }}
                >
                    Rules
                </Button>
                <Button
                    variant="contained"
                    onClick={onSubmit}
                    disabled={!content.trim() || isSubmitting}
                    sx={{
                        borderRadius: "9999px",
                        px: 4,
                        py: 1,
                        textTransform: "none",
                        fontWeight: 600,
                    }}
                >
                    {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

