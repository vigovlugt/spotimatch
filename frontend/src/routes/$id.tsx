import {
    SpotifyData,
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
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

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

    const [spotifyData, setSpotifyData] = useState<SpotifyData | undefined>(
        undefined
    );

    useEffect(() => {
        async function getData() {
            if (!isAuthenticated) {
                return;
            }
            try {
                const [profileData, topTracks] = await Promise.all([
                    spotify.currentUser.profile(),
                    spotify.currentUser.topItems("tracks", "short_term", 50, 0),
                ]);
                setSpotifyData({
                    profile: profileData,
                    topTracks: topTracks.items,
                });
            } catch (e) {
                console.error("Could not get spotify data", e);
                toast.error("Error getting spotify data");
            }
        }
        getData();
    }, [isAuthenticated]);

    const [hasSentInfo, setHasSentInfo] = useState(false);
    async function sendInfo(data: SpotifyData) {
        if (hasSentInfo) {
            return;
        }

        if (!isAuthenticated) {
            return;
        }

        if (!spotifyData) {
            return;
        }

        try {
            client.sendInfo(data);
            setHasSentInfo(true);
        } catch (e) {
            console.error("Could not send info", e);
            toast.error("Error joining game");
        }
    }

    const [isSharedAccount, setIsSharedAccount] = useState<boolean | undefined>(
        undefined
    );
    const [showPickSongs, setShowPickSongs] = useState(false);
    const [pickedArtists, setPickedArtists] = useState<Set<string>>(new Set());

    const artistById = new Map(
        spotifyData?.topTracks.map(
            (track) => [track.artists[0].id, track.artists[0]] as const
        ) ?? []
    );

    if (isAuthenticated) {
        if (!spotifyData) {
            return (
                <div className="flex justify-center items-center h-full">
                    <Card>
                        <h1 className="text-3xl font-bold">Loading...</h1>
                    </Card>
                </div>
            );
        }

        return (
            <div className="flex justify-center items-center h-full">
                <Card>
                    <h1 className="text-3xl font-bold">
                        {!hasSentInfo
                            ? "Joining game, sending data..."
                            : "Game joined!"}
                    </h1>
                </Card>

                <Dialog open={isSharedAccount === undefined}>
                    <DialogContent className="sm:max-w-[425px]" hideClose>
                        <DialogHeader>
                            <DialogTitle>
                                Do you share your Spotify account?
                            </DialogTitle>
                        </DialogHeader>

                        <div className="flex gap-4">
                            <Button
                                className="grow"
                                onClick={() => {
                                    setIsSharedAccount(true);
                                    setShowPickSongs(true);
                                }}
                            >
                                Yes
                            </Button>
                            <Button
                                className="grow"
                                onClick={() => {
                                    setIsSharedAccount(false);
                                    sendInfo(spotifyData);
                                }}
                            >
                                No
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={showPickSongs}>
                    <DialogContent className="sm:max-w-[425px]" hideClose>
                        <DialogHeader>
                            <DialogTitle>Choose your artists</DialogTitle>
                        </DialogHeader>

                        <div className="flex flex-col gap-1 overflow-y-auto p-1 max-h-[70vh]">
                            {[...artistById.keys()].map((artistId) => {
                                const artist = artistById.get(artistId)!;
                                const isSelected = pickedArtists.has(artistId);
                                console.log(artist);

                                return (
                                    <Button
                                        key={artistId}
                                        variant={
                                            isSelected ? "default" : "outline"
                                        }
                                        className={
                                            isSelected
                                                ? "border border-transparent"
                                                : ""
                                        }
                                        onClick={() =>
                                            setPickedArtists((prev) =>
                                                prev.has(artistId)
                                                    ? new Set(
                                                          [...prev].filter(
                                                              (id) =>
                                                                  id !==
                                                                  artistId
                                                          )
                                                      )
                                                    : new Set([
                                                          ...prev,
                                                          artistId,
                                                      ])
                                            )
                                        }
                                    >
                                        {artist.name}
                                    </Button>
                                );
                            })}
                        </div>

                        <DialogFooter>
                            <Button
                                onClick={() => {
                                    const data = {
                                        ...spotifyData,
                                        topTracks: spotifyData.topTracks.filter(
                                            (track) =>
                                                pickedArtists.has(
                                                    track.artists[0].id
                                                )
                                        ),
                                    };
                                    sendInfo(data);
                                    setShowPickSongs(false);
                                }}
                            >
                                Submit
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
