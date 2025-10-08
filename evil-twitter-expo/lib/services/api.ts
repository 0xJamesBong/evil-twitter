// API configuration and base URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export { API_BASE_URL };

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const { supabase } = await import("../supabase");
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
};

// API service functions
export const api = {
  // Tweets
  async getTweets() {
    const response = await fetch(`${API_BASE_URL}/tweets`);
    if (!response.ok) throw new Error("Failed to fetch tweets");
    return response.json();
  },

  async createTweet(content: string, userId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tweets`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content, owner_id: userId }),
    });
    if (!response.ok) throw new Error("Failed to create tweet");
    return response.json();
  },

  async quoteTweet(content: string, originalTweetId: string, userId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tweets/quote`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content,
        original_tweet_id: originalTweetId,
        owner_id: userId,
      }),
    });
    if (!response.ok) throw new Error("Failed to quote tweet");
    return response.json();
  },

  async retweetTweet(tweetId: string, userId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tweets/${tweetId}/retweet`, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: userId }),
    });
    if (!response.ok) throw new Error("Failed to retweet");
    return response.json();
  },

  async replyTweet(content: string, repliedToTweetId: string, userId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tweets/reply`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content,
        replied_to_tweet_id: repliedToTweetId,
        owner_id: userId,
      }),
    });
    if (!response.ok) throw new Error("Failed to reply to tweet");
    return response.json();
  },

  // Users
  async getUser(supabaseId: string) {
    const response = await fetch(
      `${API_BASE_URL}/users?supabase_id=${supabaseId}`
    );
    if (!response.ok) throw new Error("Failed to fetch user");
    return response.json();
  },

  async createUser(userData: any) {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error("Failed to create user");
    return response.json();
  },

  // Weapons
  async getWeaponCatalog() {
    const response = await fetch(`${API_BASE_URL}/weapons/catalog`);
    if (!response.ok) throw new Error("Failed to fetch weapon catalog");
    return response.json();
  },

  async buyWeapon(userId: string, catalogId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/weapons/${userId}/buy`, {
      method: "POST",
      headers,
      body: JSON.stringify({ catalog_id: catalogId }),
    });
    if (!response.ok) throw new Error("Failed to buy weapon");
    return response.json();
  },

  async getUserWeapons(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/weapons`);
    if (!response.ok) throw new Error("Failed to fetch user weapons");
    return response.json();
  },

  // Health/Actions
  async attackTweet(tweetId: string, weaponId: string) {
    const response = await fetch(`${API_BASE_URL}/tweets/${tweetId}/attack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weapon_id: weaponId }),
    });
    if (!response.ok) throw new Error("Failed to attack tweet");
    return response.json();
  },

  async healTweet(tweetId: string, weaponId: string) {
    const response = await fetch(`${API_BASE_URL}/tweets/${tweetId}/heal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weapon_id: weaponId }),
    });
    if (!response.ok) throw new Error("Failed to heal tweet");
    return response.json();
  },
};
