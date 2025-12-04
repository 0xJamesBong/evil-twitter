import { useRef } from "react";

interface QueuedVote {
    side: "pump" | "smack";
    resolve: () => void;
    reject: (error: unknown) => void;
}

export function useVoteQueue(
    runVote: (side: "pump" | "smack") => Promise<void>
) {
    const queue = useRef<QueuedVote[]>([]);
    const working = useRef(false);

    async function process() {
        if (working.current) return;
        working.current = true;

        while (queue.current.length > 0) {
            const { side, resolve, reject } = queue.current.shift()!;
            try {
                await runVote(side);
                resolve();
            } catch (e) {
                console.error("Vote failed:", e);
                reject(e);
            }
        }

        working.current = false;
    }

    return function enqueue(side: "pump" | "smack"): Promise<void> {
        return new Promise((resolve, reject) => {
            queue.current.push({ side, resolve, reject });
            process();
        });
    };
}

