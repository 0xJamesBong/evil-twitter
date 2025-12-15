"use client";

import { useState, useMemo } from "react";
import {
    Box,
    Typography,
    Divider,
    ToggleButton,
    ToggleButtonGroup,
    Stack,
} from "@mui/material";
import {
    TrendingUp as TrendingUpIcon,
    AccessTime as AccessTimeIcon,
} from "@mui/icons-material";
import { TweetNode } from "@/lib/graphql/tweets/types";
import { AnswerWithComments } from "@/lib/graphql/tweets/queries";
import { TweetCard } from "./TweetCard";
import { AnswerCard } from "./AnswerCard";
import { CommentSection } from "./CommentSection";

interface QuestionThreadViewProps {
    question: TweetNode;
    questionComments: TweetNode[];
    answers: AnswerWithComments[];
    onReply?: (tweet: TweetNode) => void;
    onQuote?: (tweet: TweetNode) => void;
    onRetweet?: (tweet: TweetNode) => void;
    onLike?: (tweet: TweetNode) => void;
    onAnswer?: (tweet: TweetNode) => void;
}

type SortMode = "votes" | "time";

export function QuestionThreadView({
    question,
    questionComments,
    answers,
    onReply,
    onQuote,
    onRetweet,
    onLike,
    onAnswer,
}: QuestionThreadViewProps) {
    const [sortMode, setSortMode] = useState<SortMode>("votes");

    const sortedAnswers = useMemo(() => {
        const sorted = [...answers];
        if (sortMode === "votes") {
            sorted.sort((a, b) => {
                const aVotes = (a.answer.postState?.upvotes || 0) + (a.answer.postState?.downvotes || 0);
                const bVotes = (b.answer.postState?.upvotes || 0) + (b.answer.postState?.downvotes || 0);
                return bVotes - aVotes; // Descending
            });
        } else {
            sorted.sort((a, b) => {
                const aTime = new Date(a.answer.createdAt).getTime();
                const bTime = new Date(b.answer.createdAt).getTime();
                return bTime - aTime; // Descending (newest first)
            });
        }
        return sorted;
    }, [answers, sortMode]);

    const handleSortChange = (
        _event: React.MouseEvent<HTMLElement>,
        newSortMode: SortMode | null
    ) => {
        if (newSortMode !== null) {
            setSortMode(newSortMode);
        }
    };

    return (
        <Box>
            {/* Question Section */}
            <Box sx={{ mb: 3 }}>
                <TweetCard
                    tweet={question}
                    onReply={onReply}
                    onQuote={onQuote}
                    onRetweet={onRetweet}
                    onLike={onLike}
                    onAnswer={onAnswer}
                    clickable={true}
                />
            </Box>

            {/* Question Comments Section */}
            {questionComments.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Comments ({questionComments.length})
                    </Typography>
                    <CommentSection
                        comments={questionComments}
                        parentId={question.id || ""}
                        onReply={onReply}
                        onQuote={onQuote}
                        onRetweet={onRetweet}
                        onLike={onLike}
                        defaultExpanded={true}
                    />
                </Box>
            )}

            <Divider sx={{ my: 4 }} />

            {/* Answers Section */}
            <Box>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 3,
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {answers.length} {answers.length === 1 ? "Answer" : "Answers"}
                    </Typography>
                    <ToggleButtonGroup
                        value={sortMode}
                        exclusive
                        onChange={handleSortChange}
                        size="small"
                        sx={{
                            "& .MuiToggleButton-root": {
                                textTransform: "none",
                                px: 2,
                            },
                        }}
                    >
                        <ToggleButton value="votes">
                            <TrendingUpIcon sx={{ mr: 1, fontSize: 18 }} />
                            Votes
                        </ToggleButton>
                        <ToggleButton value="time">
                            <AccessTimeIcon sx={{ mr: 1, fontSize: 18 }} />
                            Newest
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {sortedAnswers.length === 0 ? (
                    <Box
                        sx={{
                            p: 4,
                            textAlign: "center",
                            borderRadius: 2,
                            bgcolor: "rgba(255,255,255,0.02)",
                            border: 1,
                            borderColor: "rgba(255,255,255,0.1)",
                        }}
                    >
                        <Typography variant="body1" color="text.secondary">
                            No answers yet. Be the first to answer!
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={0}>
                        {sortedAnswers.map((answerWithComments) => (
                            <AnswerCard
                                key={answerWithComments.answer.id}
                                answer={answerWithComments.answer}
                                comments={answerWithComments.comments}
                                onReply={onReply}
                                onQuote={onQuote}
                                onRetweet={onRetweet}
                                onLike={onLike}
                            />
                        ))}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}

