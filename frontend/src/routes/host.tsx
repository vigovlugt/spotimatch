import { Card } from "@/components/ui/card";
import { createLobbyOwner } from "@/lib/lobby";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { LoaderCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameData, setGameData } from "@/lib/game";

export const Route = createFileRoute("/host")({
    loader: async () => {
        const lobbyOwner = await createLobbyOwner();

        return {
            lobbyOwner,
        };
    },
    component: Host,
});

function Host() {
    const { lobbyOwner } = Route.useLoaderData();
    const navigate = useNavigate();
    const players = useSyncExternalStore(
        lobbyOwner.subscribePlayers,
        () => lobbyOwner.players
    );

    const joinUrl = `${location.origin.replace(/^https?:\/\//, "")}/${lobbyOwner.lobbyId}`;

    return (
        <div className="flex flex-col gap-2 h-full">
            <Card className="flex gap-3 items-start shrink-0 grow-0 justify-center">
                <h2 className="text-4xl font-bold py-2">Join game:</h2>
                <Card
                    className="bg-[#2a2a2a] text-4xl font-bold cursor-pointer"
                    onClick={() => {
                        navigator.clipboard.writeText(joinUrl);
                        toast("Copied to clipboard");
                    }}
                >
                    {joinUrl}
                </Card>
            </Card>
            <Card className="flex flex-col flex-1 gap-3">
                <h2 className="text-4xl font-bold shrink-0 grow-0">Players</h2>
                <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
                    {players.map((player) => (
                        <Card
                            className="bg-[#2a2a2a] w-full flex gap-4 items-center p-0"
                            key={player.id}
                        >
                            {!player.data ? (
                                <div className="w-[64px] h-[64px] rounded-l-sm bg-[#1f1f1f] flex items-center justify-center">
                                    <LoaderCircle className="animate-spin w-7 h-7" />
                                </div>
                            ) : (
                                <img
                                    src={player.data.profile.images[0].url}
                                    alt="profile"
                                    className="w-[64px] h-[64px] rounded-l-sm"
                                />
                            )}
                            <h3 className="text-2xl font-bold">
                                {player.data?.profile.display_name ??
                                    "Joining..."}
                            </h3>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-center items-center shrink-0 grow-0">
                    <Button
                        onClick={() => {
                            const gameData: GameData = {
                                players: players
                                    .map((p) => p.data)
                                    .filter(Boolean),
                            };
                            setGameData(gameData);
                            lobbyOwner.close();

                            navigate({
                                to: "/play",
                            });
                        }}
                        className="rounded-full w-[58px] h-[58px]"
                    >
                        <Play className="w-7 h-7" fill="black" />
                    </Button>
                </div>
            </Card>
        </div>
    );
}
