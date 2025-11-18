"use client";

import { usePrivy } from "@privy-io/react-auth";
import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
import { TweetWall } from "@/components/tweets/TweetWall";

function HomeContent() {
  const { ready } = usePrivy();

  if (!ready) {
    return <FullScreenLoader />;
  }

  // Show tweets to everyone, authenticated or not
  return <TweetWall />;
}

function Home() {
  return <HomeContent />;
}

export default Home;
