"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { useTweetStore } from "../../lib/stores/tweetStore";
import { TweetNode } from "../../lib/graphql/tweets/types";

interface VoteButtonsProps {
  tweet: TweetNode;
}

export function VoteButtons({ tweet }: VoteButtonsProps) {
  const [votes, setVotes] = useState(1);
  const [loading, setLoading] = useState(false);
  const { getAccessToken } = usePrivy();
  const { voteOnTweet } = useTweetStore();
  const { enqueueSnackbar } = useSnackbar();

  const handleVote = async (side: "pump" | "smack") => {
    if (!tweet.id) return;

    // Validate post state
    if (!isOpen) {
      enqueueSnackbar("This post is no longer open for voting", { variant: "error" });
      return;
    }

    if (votes <= 0) {
      enqueueSnackbar("Please enter a valid vote amount", { variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        enqueueSnackbar("Please log in to vote", { variant: "error" });
        return;
      }
      await voteOnTweet(token, tweet.id, side, votes);
      enqueueSnackbar(`Successfully voted ${side}!`, { variant: "success" });
      // Reset votes input after successful vote
      setVotes(1);
    } catch (error) {
      console.error("Failed to vote:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to vote";
      
      // Show user-friendly error messages
      if (errorMessage.includes("Insufficient")) {
        enqueueSnackbar("Insufficient vault balance. Please deposit more tokens.", { variant: "error" });
      } else if (errorMessage.includes("expired") || errorMessage.includes("Expired")) {
        enqueueSnackbar("This post has expired and can no longer be voted on", { variant: "error" });
      } else if (errorMessage.includes("settled") || errorMessage.includes("Settled")) {
        enqueueSnackbar("This post has already been settled", { variant: "error" });
      } else if (errorMessage.includes("not open") || errorMessage.includes("Not open")) {
        enqueueSnackbar("This post is not open for voting", { variant: "error" });
      } else {
        enqueueSnackbar(errorMessage, { variant: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  const postState = tweet.postState;
  const upvotes = postState?.upvotes || 0;
  const downvotes = postState?.downvotes || 0;
  const isOpen = postState?.state === "Open";

  if (!tweet.postIdHash) {
    // Not an original tweet, no voting
    return null;
  }

  return (
    <div className="flex items-center gap-4 mt-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleVote("pump")}
          disabled={loading || !isOpen}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pump {upvotes}
        </button>
        <button
          onClick={() => handleVote("smack")}
          disabled={loading || !isOpen}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Smack {downvotes}
        </button>
      </div>
      {isOpen && (
        <input
          type="number"
          min="1"
          value={votes}
          onChange={(e) => setVotes(parseInt(e.target.value) || 1)}
          className="w-20 px-2 py-1 border rounded"
          disabled={loading}
        />
      )}
      {postState && (
        <span className="text-sm text-gray-500">
          {postState.state === "Settled" && postState.winningSide
            ? `Winner: ${postState.winningSide}`
            : postState.state}
        </span>
      )}
    </div>
  );
}

