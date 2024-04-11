import {
    createLobbyClient,
    getLobbyJoinIntent,
    setLobbyJoinIntent,
} from "@/lib/lobby";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { spotify } from "@/lib/spotify";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/$id")({
    loader: async ({ params: { id } }) => {
        console.log("Joining lobby", id);
        id = id.toUpperCase();

        let existingPlayerId = undefined;

        const lobbyJoinIntent = getLobbyJoinIntent();
        if (
            lobbyJoinIntent &&
            lobbyJoinIntent.lobbyId === id &&
            Date.now() < lobbyJoinIntent.expiresAt
        ) {
            existingPlayerId = lobbyJoinIntent.playerId;
        }

        try {
            const client = await createLobbyClient(id, existingPlayerId);
            const accessToken = await spotify.getAccessToken();

            setLobbyJoinIntent({
                lobbyId: id,
                playerId: client.playerId,
                expiresAt: Date.now() + 1000 * 60 * 5,
            });

            console.log("Joined lobby", id);

            return {
                client,
                isAuthenticated: accessToken !== null,
            };
        } catch (e) {
            console.error("Could not connect to ws", e);
            toast.error("Could not connect to game " + id);
            throw redirect({
                to: "/",
            });
        }
    },
    component: Lobby,
});

function Lobby() {
    const { client, isAuthenticated } = Route.useLoaderData();

    const [hasSentInfo, setHasSentInfo] = useState(false);
    useEffect(() => {
        async function sendInfo() {
            if (hasSentInfo) {
                return;
            }

            if (isAuthenticated) {
                await client.sendInfo();
                setHasSentInfo(true);
            }
        }
        sendInfo();
    }, [client, isAuthenticated, hasSentInfo]);

    console.log(client, isAuthenticated);
    if (isAuthenticated) {
        return (
            <div className="flex justify-center items-center h-full">
                <Card>
                    <h1 className="text-3xl font-bold">
                        {!hasSentInfo
                            ? "Joining game, sending data..."
                            : "Game joined!"}
                    </h1>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center h-full">
            <Card className="flex flex-col gap-3 md:max-w-lg mx-auto">
                <h1 className="text-3xl font-bold">Game {client.lobbyId}</h1>
                <Button onClick={() => spotify.authenticate()}>
                    Sign in with Spotify to join game
                </Button>
            </Card>
        </div>
    );
}
