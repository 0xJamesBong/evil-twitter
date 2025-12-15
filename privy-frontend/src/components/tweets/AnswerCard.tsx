"use client";

import { Box, Button, Typography, Link as MuiLink } from "@mui/material";
import { OpenInNew as OpenInNewIcon } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { TweetNode } from "@/lib/graphql/tweets/types";
import { TweetCard } from "./TweetCard";
import { CommentSection } from "./CommentSection";

interface AnswerCardProps {
    answer: TweetNode;
    comments: TweetNode[];
    onReply?: (tweet: TweetNode) => void;
    onQuote?: (tweet: TweetNode) => void;
    onRetweet?: (tweet: TweetNode) => void;
    onLike?: (tweet: TweetNode) => void;
}

export function AnswerCard({
    answer,
    comments,
    onReply,
    onQuote,
    onRetweet,
    onLike,
}: AnswerCardProps) {
    const router = useRouter();

    const handleViewFullThread = () => {
        if (answer.id) {
            router.push(`/tweets/${answer.id}`);
        }
    };

    return (
        <Box
            sx={{
                border: 1,
                borderColor: "rgba(255,255,255,0.1)",
                borderRadius: 2,
                p: 2,
                mb: 2,
                bgcolor: "rgba(255,255,255,0.02)",
            }}
        >
            <TweetCard
                tweet={answer}
                onReply={onReply}
                onQuote={onQuote}
                onRetweet={onRetweet}
                onLike={onLike}
                clickable={true}
            />
            
            {comments.length > 0 && (
                <Box sx={{ mt: 2, pl: 2 }}>
                    <CommentSection
                        comments={comments}
                        parentId={answer.id || ""}
                        onReply={onReply}
                        onQuote={onQuote}
                        onRetweet={onRetweet}
                        onLike={onLike}
                        defaultExpanded={false}
                    />
                </Box>
            )}

            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                <Button
                    variant="text"
                    size="small"
                    startIcon={<OpenInNewIcon />}
                    onClick={handleViewFullThread}
                    sx={{
                        textTransform: "none",
                        color: "text.secondary",
                        "&:hover": {
                            bgcolor: "rgba(255,255,255,0.05)",
                        },
                    }}
                >
                    View full thread
                </Button>
            </Box>
        </Box>
    );
}

