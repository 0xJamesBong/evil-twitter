"use client";

import { useState } from "react";
import {
    Box,
    Typography,
    IconButton,
    Collapse,
    Stack,
} from "@mui/material";
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { TweetNode } from "@/lib/graphql/tweets/types";
import { TweetCard } from "./TweetCard";

interface CommentSectionProps {
    comments: TweetNode[];
    parentId: string;
    onReply?: (tweet: TweetNode) => void;
    onQuote?: (tweet: TweetNode) => void;
    onRetweet?: (tweet: TweetNode) => void;
    onLike?: (tweet: TweetNode) => void;
    defaultExpanded?: boolean;
}

export function CommentSection({
    comments,
    parentId,
    onReply,
    onQuote,
    onRetweet,
    onLike,
    defaultExpanded = false,
}: CommentSectionProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    if (comments.length === 0) {
        return null;
    }

    const handleToggle = () => {
        setExpanded(!expanded);
    };

    // Group comments by parent for hierarchical display
    const commentsByParent = new Map<string, TweetNode[]>();
    const topLevelComments: TweetNode[] = [];

    comments.forEach((comment) => {
        const commentParentId = comment.repliedToTweetId;
        if (commentParentId && commentParentId !== parentId) {
            // This is a nested comment (replies to another comment, not the parent)
            const list = commentsByParent.get(commentParentId) || [];
            list.push(comment);
            commentsByParent.set(commentParentId, list);
        } else {
            // This is a top-level comment (directly replies to parent)
            topLevelComments.push(comment);
        }
    });

    const renderCommentTree = (comment: TweetNode, depth: number = 0): React.ReactNode => {
        const childComments = commentsByParent.get(comment.id || "") || [];

        return (
            <Box key={comment.id} sx={{ mb: depth === 0 ? 1 : 0.5 }}>
                <Box
                    sx={{
                        pl: depth > 0 ? 3 : 0,
                        borderLeft: depth > 0 ? 1 : 0,
                        borderColor: "rgba(255,255,255,0.1)",
                    }}
                >
                    <TweetCard
                        tweet={comment}
                        onReply={onReply}
                        onQuote={onQuote}
                        onRetweet={onRetweet}
                        onLike={onLike}
                        clickable={true}
                    />
                    {childComments.length > 0 && (
                        <Box sx={{ mt: 0.5 }}>
                            {childComments.map((child) => renderCommentTree(child, depth + 1))}
                        </Box>
                    )}
                </Box>
            </Box>
        );
    };

    return (
        <Box sx={{ mt: 1 }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    cursor: "pointer",
                    py: 1,
                    px: 1,
                    borderRadius: 1,
                    "&:hover": {
                        bgcolor: "rgba(255,255,255,0.05)",
                    },
                }}
                onClick={handleToggle}
            >
                <IconButton size="small" sx={{ color: "text.secondary" }}>
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                    {comments.length} {comments.length === 1 ? "comment" : "comments"}
                </Typography>
            </Box>
            <Collapse in={expanded}>
                <Box sx={{ pl: 2, pt: 1 }}>
                    <Stack spacing={1}>
                        {topLevelComments.map((comment) => renderCommentTree(comment))}
                    </Stack>
                </Box>
            </Collapse>
        </Box>
    );
}

