import { type ClassValue, clsx } from "clsx";
import prand from "pure-rand";
import { twMerge } from "tailwind-merge";
import { SpotifyData } from "./lobby";

export const PROD = import.meta.env.PROD || true;

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const COLORS = [
    "#f43f5e",
    "#ec4899",
    "#d946ef",
    "#a855f7",
    "#8b5cf6",
    "#6366f1",
    "#3b82f6",
    "#0ea5e9",
    "#06b6d4",
    "#14b8a6",
    "#10b981",
    "#22c55e",
    "#84cc16",
    "#eab308",
    "#f59e0b",
    "#f97316",
    "#ef4444",
];

export function hash(s: string) {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

export function colorByPlayer(player: SpotifyData) {
    return COLORS[
        prand.unsafeUniformIntDistribution(
            0,
            COLORS.length - 1,
            prand.xoroshiro128plus(hash(player.profile.id))
        )
    ];
}
