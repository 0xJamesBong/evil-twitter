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
import { Close as CloseIcon, Send as SendIcon, HelpOutline as QuestionIcon } from "@mui/icons-material";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { Language } from "@/lib/graphql/types";

const LANGUAGE_FONT_FAMILY: Record<Language, string | null> = {
  [Language.CANTONESE]: 'var(--font-jyutcitzi), Arial, Helvetica, sans-serif',
  [Language.GOETSUAN]: 'var(--font-goetsusioji), Arial, Helvetica, sans-serif',
  [Language.NONE]: null,
};

interface QuestionModalProps {
    open: boolean;
    onClose: () => void;
    content: string;
    onContentChange: (content: string) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export function QuestionModal({
    open,
    onClose,
    content,
    onContentChange,
    onSubmit,
    isSubmitting,
}: QuestionModalProps) {
    const { user: backendUser } = useBackendUserStore();
    
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
                    <Typography variant="h6" sx={{ flexGrow: 1, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                        <QuestionIcon />
                        Ask a Question
                    </Typography>
                    <Box sx={{ width: 40 }} /> {/* Spacer for centering */}
                </Box>
            </DialogTitle>

            <DialogContent>
                <Stack spacing={2} sx={{ pt: 2 }}>
                    {/* Question Input */}
                    <Box sx={{ display: "flex", gap: 2 }}>
                        <Avatar
                            sx={{ width: 40, height: 40, bgcolor: "primary.main" }}
                        >
                            ?
                        </Avatar>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            placeholder="What would you like to know?"
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
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 7 }}>
                        Questions can be answered by the community. The asker can approve or disapprove answers.
                    </Typography>
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
                    {isSubmitting ? "Posting..." : "Ask Question"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

