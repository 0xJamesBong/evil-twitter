"use client";

import { useState } from "react";
import { Box, TextField, Button, Stack, Paper } from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { TweetCard, MockTweet } from "./TweetCard";
import { ReplyModal } from "./ReplyModal";
import { QuoteModal } from "./QuoteModal";
import { RetweetModal } from "./RetweetModal";
import { generateMockTweets } from "@/lib/mockData/tweets";
import { useSnackbar } from "notistack";

export function TweetWall() {
    const { enqueueSnackbar } = useSnackbar();
    const [tweets] = useState<MockTweet[]>(() => generateMockTweets(20));
    const [newTweetContent, setNewTweetContent] = useState("");
    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [quoteModalOpen, setQuoteModalOpen] = useState(false);
    const [retweetModalOpen, setRetweetModalOpen] = useState(false);
    const [selectedTweet, setSelectedTweet] = useState<MockTweet | null>(null);

    const handleReply = (tweet: MockTweet) => {
        setSelectedTweet(tweet);
        setReplyModalOpen(true);
    };

    const handleQuote = (tweet: MockTweet) => {
        setSelectedTweet(tweet);
        setQuoteModalOpen(true);
    };

    const handleRetweet = (tweet: MockTweet) => {
        setSelectedTweet(tweet);
        setRetweetModalOpen(true);
    };

    const handleLike = (tweet: MockTweet) => {
        enqueueSnackbar(`Liked @${tweet.author.handle}'s tweet`, { variant: "success" });
        // TODO: Implement like
    };

    const handlePostTweet = () => {
        if (!newTweetContent.trim()) return;
        enqueueSnackbar("Tweet posted! (Mock - not saved)", { variant: "success" });
        setNewTweetContent("");
        // TODO: Call GraphQL mutation
    };

    return (
        <Box sx={{ maxWidth: 600, mx: "auto" }}>
            {/* Compose Tweet */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: "grey.200",
                }}
            >
                <Stack spacing={2}>
                    <TextField
                        placeholder="What's happening?"
                        multiline
                        rows={3}
                        value={newTweetContent}
                        onChange={(e) => setNewTweetContent(e.target.value)}
                        variant="outlined"
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                "& fieldset": {
                                    border: "none",
                                },
                            },
                        }}
                    />
                    <Stack direction="row" justifyContent="flex-end">
                        <Button
                            variant="contained"
                            onClick={handlePostTweet}
                            disabled={!newTweetContent.trim()}
                            startIcon={<SendIcon />}
                            sx={{
                                borderRadius: "9999px",
                                px: 3,
                            }}
                        >
                            Tweet
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {/* Tweet Feed */}
            <Box>
                {tweets.map((tweet) => (
                    <TweetCard
                        key={tweet.id}
                        tweet={tweet}
                        onReply={handleReply}
                        onQuote={handleQuote}
                        onRetweet={handleRetweet}
                        onLike={handleLike}
                    />
                ))}
            </Box>

            {/* Modals */}
            <ReplyModal
                open={replyModalOpen}
                onClose={() => {
                    setReplyModalOpen(false);
                    setSelectedTweet(null);
                }}
                tweet={selectedTweet}
            />
            <QuoteModal
                open={quoteModalOpen}
                onClose={() => {
                    setQuoteModalOpen(false);
                    setSelectedTweet(null);
                }}
                tweet={selectedTweet}
            />
            <RetweetModal
                open={retweetModalOpen}
                onClose={() => {
                    setRetweetModalOpen(false);
                    setSelectedTweet(null);
                }}
                tweet={selectedTweet}
            />
        </Box>
    );
}

