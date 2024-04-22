import { SpotifyData } from "./lobby";

export type GameData = {
    players: SpotifyData[];
    targetScore: number;
};

export function setGameData(data: GameData) {
    localStorage.setItem("gameData", JSON.stringify(data));
}

export function getGameData(): GameData | null {
    const data = localStorage.getItem("gameData");
    if (!data) return null;
    return JSON.parse(data) as GameData;
}

export type IntroStage = {
    type: "intro";
};

export type RoundStageSubStage =
    | "intro"
    | "listen"
    | "select"
    | "reveal-match"
    | "submit"
    | "leaderboard";

export type RoundStage<Stage extends RoundStageSubStage = RoundStageSubStage> =
    {
        type: "round";
        round: number;
        subStage: Stage;
        trackId: string;
    };

export type EndStage = {
    type: "end";
};

export type GameStage = IntroStage | RoundStage | EndStage;

export type GameState<Stage extends GameStage = GameStage> = {
    scoreByPlayer: Record<string, number>;
    previousScoreByPlayer: Record<string, number>;
    previousSongs: string[];
    stage: Stage;
};

export function newGameState(players: SpotifyData[]): GameState {
    return {
        scoreByPlayer: Object.fromEntries(
            players.map((player) => [player.profile.id, 0])
        ),
        previousScoreByPlayer: Object.fromEntries(
            players.map((player) => [player.profile.id, 0])
        ),
        previousSongs: [],
        stage: { type: "intro" },
    };
}

export function advanceStage(data: GameData, state: GameState) {
    switch (state.stage.type) {
        case "intro":
            state.stage = newRoundState(data.players, state.previousSongs, 0);
            break;
        case "round":
            switch (state.stage.subStage) {
                case "intro":
                    state.stage.subStage = "listen";
                    break;
                case "listen":
                    state.stage.subStage = "select";
                    break;
                case "select":
                    state.stage.subStage = "reveal-match";
                    break;
                case "reveal-match":
                    state.stage.subStage = "submit";
                    break;
                case "submit":
                    state.stage.subStage = "leaderboard";
                    break;
                case "leaderboard": {
                    const maxScore = Math.max(
                        ...Object.values(state.scoreByPlayer)
                    );
                    if (maxScore >= data.targetScore) {
                        state.stage = { type: "end" };
                        break;
                    }

                    state.stage = newRoundState(
                        data.players,
                        state.previousSongs,
                        (state.stage as RoundStage).round
                    );
                    break;
                }
            }
            break;
    }
}

function newRoundState(
    players: SpotifyData[],
    previousSongs: string[],
    currentRound: number
): RoundStage {
    return {
        type: "round",
        round: currentRound + 1,
        subStage: "intro",
        trackId: selectNewSong(players, previousSongs),
    };
}

function getPlayersByArtist(
    players: SpotifyData[]
): Map<string, Set<SpotifyData>> {
    const playersByArtist = new Map<string, Set<SpotifyData>>();
    for (const player of players) {
        for (const song of player.topTracks) {
            for (const artist of song.artists) {
                if (!playersByArtist.has(artist.id)) {
                    playersByArtist.set(artist.id, new Set());
                }
                const existing = playersByArtist.get(artist.id)!;
                existing.add(player);
            }
        }
    }

    return playersByArtist;
}

function getPlayersByAlbum(
    players: SpotifyData[]
): Map<string, Set<SpotifyData>> {
    const playersByAlbum = new Map<string, Set<SpotifyData>>();
    for (const player of players) {
        for (const song of player.topTracks) {
            if (!playersByAlbum.has(song.album.id)) {
                playersByAlbum.set(song.album.id, new Set());
            }
            const existing = playersByAlbum.get(song.album.id)!;
            existing.add(player);
        }
    }

    return playersByAlbum;
}

function selectNewSong(players: SpotifyData[], previousSongIds: string[]) {
    const previousSongsSet = new Set(previousSongIds);
    const playersByArtist = getPlayersByArtist(players);
    const playersByAlbum = getPlayersByAlbum(players);
    const songById = new Map<string, SpotifyData["topTracks"][0]>(
        players.flatMap((player) =>
            player.topTracks.map((track) => [track.id, track])
        )
    );

    const previousSongArtists = new Set(
        previousSongIds
            .map((id) => songById.get(id)!.artists.at(0)?.id)
            .filter(Boolean)
    );
    const previousSongAlbums = new Set(
        previousSongIds.map((id) => songById.get(id)!.album.id)
    );

    const player = players[Math.floor(Math.random() * players.length)];
    const possibleSongs = player.topTracks.filter(
        (song) => !previousSongsSet.has(song.id) && song.preview_url !== null
    );
    if (possibleSongs.length === 0) {
        return selectNewSong(players, previousSongIds);
    }

    const weightBySong = new Map<string, number>(
        possibleSongs.map((song) => [
            song.id,
            calculateSongWeight(
                previousSongsSet,
                playersByArtist,
                playersByAlbum,
                previousSongArtists,
                previousSongAlbums,
                song
            ),
        ])
    );

    return weightedRandom(weightBySong);
}

function calculateSongWeight(
    previousSongsSet: Set<string>,
    playersByArtist: Map<string, Set<SpotifyData>>,
    playersByAlbum: Map<string, Set<SpotifyData>>,
    previousSongArtists: Set<string>,
    previousSongAlbums: Set<string>,
    song: SpotifyData["topTracks"][0]
) {
    let weight = song.popularity;
    if (previousSongsSet.has(song.id)) {
        return 0;
    }

    const artist = song.artists.at(0);
    if (artist === undefined) {
        return weight;
    }

    const albumPlayers = playersByAlbum.get(song.album.id)!;
    const albumIsPrevious = previousSongAlbums.has(song.album.id);
    const artistPlayers = playersByArtist.get(artist.id)!;
    const artistIsPrevious = previousSongArtists.has(artist.id);

    // If the album has been played before, and only one player listens to the album, it is too easy to know who played it
    if (albumPlayers.size === 1 && albumIsPrevious) {
        weight *= 0.25;
    }

    // If the artist has been played before, and only one player listens to the artist, it is relatively easy to know who played it
    if (artistPlayers.size === 1 && artistIsPrevious) {
        weight *= 0.5;
    }

    return weight;
}

function weightedRandom(map: Map<string, number>) {
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    const random = Math.random() * total;
    let sum = 0;
    for (const [key, value] of map.entries()) {
        sum += value;
        if (random < sum) {
            return key;
        }
    }

    throw new Error("weightedRandom failed");
}

export function getTrack(players: SpotifyData[], trackId: string) {
    for (const p of players) {
        for (const track of p.topTracks) {
            if (track.id === trackId) {
                return track;
            }
        }
    }

    throw new Error("Track not found");
}

export function getMatches(players: SpotifyData[], trackId: string) {
    const matches: SpotifyData[] = [];
    for (const p of players) {
        for (const track of p.topTracks) {
            if (track.id === trackId) {
                matches.push(p);
            }
        }
    }

    return matches;
}

export function assignWinnings(
    state: GameState<RoundStage>,
    data: GameData,
    winners: string[]
) {
    state.previousScoreByPlayer = { ...state.scoreByPlayer };

    for (const player of data.players) {
        if (winners.includes(player.profile.id)) {
            state.scoreByPlayer[player.profile.id] =
                (state.scoreByPlayer[player.profile.id] ?? 0) + 1;
        }
    }

    state.previousSongs.push(state.stage.trackId);
}
