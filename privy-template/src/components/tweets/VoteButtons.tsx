"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
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

  const handleVote = async (side: "pump" | "smack") => {
    if (!tweet.id) return;

    setLoading(true);
    try {
      const token = await getAccessToken();
      await voteOnTweet(token || "", tweet.id, side, votes);
      // Reset votes input after successful vote
      setVotes(1);
    } catch (error) {
      console.error("Failed to vote:", error);
      // Error is handled by the store
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

