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
import Link from "next/link";
import { TweetNode } from "@/lib/graphql/tweets/types";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { Language } from "@/lib/graphql/types";

const LANGUAGE_FONT_FAMILY: Record<Language, string | null> = {
  [Language.CANTONESE]: 'var(--font-jyutcitzi), Arial, Helvetica, sans-serif',
  [Language.GOETSUAN]: 'var(--font-goetsusioji), Arial, Helvetica, sans-serif',
  [Language.NONE]: null,
};

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

    const { user: backendUser } = useBackendUserStore();
    const author = tweet.author;
    
    // Get user's language preference
    const userLanguageStr = backendUser?.language?.toUpperCase() || 'NONE';
    const userLanguage = userLanguageStr === 'CANTONESE' ? Language.CANTONESE :
                         userLanguageStr === 'GOETSUAN' ? Language.GOETSUAN :
                         Language.NONE;
    const fontFamily = LANGUAGE_FONT_FAMILY[userLanguage] ?? null;

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
                        {author?.handle ? (
                            <Link href={`/@${author.handle.replace(/^@+/, "")}`} style={{ textDecoration: "none" }}>
                                <Avatar
                                    src={author?.avatarUrl || undefined}
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        bgcolor: "primary.main",
                                        cursor: "pointer",
                                        "&:hover": {
                                            opacity: 0.8,
                                        },
                                    }}
                                >
                                    {author?.displayName?.charAt(0).toUpperCase() || "?"}
                                </Avatar>
                            </Link>
                        ) : author?.userId ? (
                            <Link href={`/user/${author.userId}`} style={{ textDecoration: "none" }}>
                                <Avatar
                                    src={author?.avatarUrl || undefined}
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        bgcolor: "primary.main",
                                        cursor: "pointer",
                                        "&:hover": {
                                            opacity: 0.8,
                                        },
                                    }}
                                >
                                    {author?.displayName?.charAt(0).toUpperCase() || "?"}
                                </Avatar>
                            </Link>
                        ) : (
                            <Avatar
                                src={author?.avatarUrl || undefined}
                                sx={{ width: 40, height: 40, bgcolor: "primary.main" }}
                            >
                                {author?.displayName?.charAt(0).toUpperCase() || "?"}
                            </Avatar>
                        )}
                        <Box sx={{ flexGrow: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                {author?.handle ? (
                                    <Link href={`/@${author.handle.replace(/^@+/, "")}`} style={{ textDecoration: "none", color: "inherit" }}>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: 700,
                                                "&:hover": { textDecoration: "underline", cursor: "pointer" },
                                            }}
                                        >
                                            {author?.displayName || "Unknown"}
                                        </Typography>
                                    </Link>
                                ) : author?.userId ? (
                                    <Link href={`/user/${author.userId}`} style={{ textDecoration: "none", color: "inherit" }}>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: 700,
                                                "&:hover": { textDecoration: "underline", cursor: "pointer" },
                                            }}
                                        >
                                            {author?.displayName || "Unknown"}
                                        </Typography>
                                    </Link>
                                ) : (
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        {author?.displayName || "Unknown"}
                                    </Typography>
                                )}
                                {author?.handle ? (
                                    <Link href={`/@${author.handle.replace(/^@+/, "")}`} style={{ textDecoration: "none", color: "inherit" }}>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                "&:hover": { textDecoration: "underline", cursor: "pointer" },
                                            }}
                                        >
                                            @{author.handle.replace(/^@+/, "")}
                                        </Typography>
                                    </Link>
                                ) : author?.userId ? (
                                    <Link href={`/user/${author.userId}`} style={{ textDecoration: "none", color: "inherit" }}>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                "&:hover": { textDecoration: "underline", cursor: "pointer" },
                                            }}
                                        >
                                            @{author?.handle || "unknown"}
                                        </Typography>
                                    </Link>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        @{author?.handle || "unknown"}
                                    </Typography>
                                )}
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
                                    ...(fontFamily && {
                                        "& input, & textarea": {
                                            fontFamily,
                                        },
                                    }),
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

