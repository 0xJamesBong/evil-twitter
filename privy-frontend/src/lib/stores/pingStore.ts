import { create } from "zustand";
import { getBackendUrl } from "../config";

type PingState = {
  response: string | null;
  isLoading: boolean;
  error: string | null;
  ping: () => Promise<void>;
  clear: () => void;
};

export const usePingStore = create<PingState>((set) => ({
  response: null,
  isLoading: false,
  error: null,

  ping: async () => {
    set({ isLoading: true, error: null, response: null });
    try {
      const backendUrl = getBackendUrl();
      const url = `${backendUrl}/ping`;
      console.log("Ping: Calling", url);
      console.log("Ping: Backend URL is", backendUrl);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(
        "Ping: Response status",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const text = await response.text();
      console.log("Ping: Response received", text);

      set({ response: text, isLoading: false });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to ping backend";
      console.error("Ping error:", errorMessage, e);
      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  clear: () => {
    set({ response: null, error: null, isLoading: false });
  },
}));
