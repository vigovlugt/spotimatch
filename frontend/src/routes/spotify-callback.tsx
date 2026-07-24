import { getLobbyJoinIntent } from "@/lib/lobby";
import { getSpotifyClient } from "@/lib/spotify";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/spotify-callback")({
    loader: async () => {
        const lobbyJoinIntent = getLobbyJoinIntent();
        if (!lobbyJoinIntent) {
            toast.error("No game join intent found");
            throw redirect({
                to: "/",
            });
        }
        if (Date.now() > lobbyJoinIntent.expiresAt) {
            toast.error("Game join intent expired");
            throw redirect({
                to: "/",
            });
        }

        const spotifyAppIndex =
            lobbyJoinIntent.spotifyAppIndex === 1 ? 1 : 0;
        await getSpotifyClient(spotifyAppIndex).authenticate();

        console.log(lobbyJoinIntent.lobbyId);

        throw redirect({
            to: "/$id",
            params: {
                id: lobbyJoinIntent.lobbyId,
            },
        });
    },
    component: () => null,
});
