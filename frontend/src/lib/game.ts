import { SpotifyData } from "./lobby";

export type GameData = {
    players: SpotifyData[];
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

export type RoundStage = {
    type: "round";
    round: number;
    subStage:
        | "intro"
        | "listen"
        | "submit"
        | "reveal-match"
        | "reveal-picks"
        | "leaderboard";
    pickByPlayer: Record<string, string>;
    trackId: string;
};

export type EndStage = {
    type: "end";
};

export type GameStage = IntroStage | RoundStage | EndStage;

export type GameState = {
    scoreByPlayer: Record<string, number>;
    previousSongs: string[];
    stage: GameStage;
};

export function newGameState(players: SpotifyData[]): GameState {
    return {
        scoreByPlayer: Object.fromEntries(
            players.map((player) => [player.profile.id, 0])
        ),
        previousSongs: [],
        stage: { type: "intro" },
    };
}

export function newRoundState(
    players: SpotifyData[],
    previousSongs: string[],
    currentRound: number
): RoundStage {
    const pickByPlayer: Record<string, string> = {};

    return {
        type: "round",
        round: currentRound + 1,
        subStage: "intro",
        pickByPlayer,
        trackId: selectNewSong(players, previousSongs),
    };
}

function selectNewSong(players: SpotifyData[], previousSongs: string[]) {
    const previousSongsSet = new Set(previousSongs);
    const playerSongs = players.map((player) => player.topTracks).flat();
    const popularityBySong = new Map<string, number>();
    for (const song of playerSongs) {
        if (previousSongsSet.has(song.id)) {
            continue;
        }

        if (song.preview_url === null) {
            continue;
        }

        if (!popularityBySong.has(song.id)) {
            popularityBySong.set(song.id, 0);
        }

        popularityBySong.set(
            song.id,
            popularityBySong.get(song.id)! + song.popularity
        );
    }

    return weightedRandom(popularityBySong);
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

export function assignWinnings(state: GameState, data: GameData) {
    const matches = getMatches(
        data.players,
        (state.stage as RoundStage).trackId
    );
    for (const match of matches) {
        state.scoreByPlayer[match.profile.id] =
            (state.scoreByPlayer[match.profile.id] ?? 0) + 1;
    }
    state.previousSongs.push((state.stage as RoundStage).trackId);
}