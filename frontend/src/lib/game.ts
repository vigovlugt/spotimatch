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

function selectNewSong(players: SpotifyData[], previousSongs: string[]) {
    const previousSongsSet = new Set(previousSongs);
    const player = players[Math.floor(Math.random() * players.length)];
    const playerSongs = player.topTracks.filter(
        (song) => !previousSongsSet.has(song.id) && song.preview_url !== null
    );
    const popularityBySong = new Map<string, number>(
        playerSongs.map((song) => [song.id, song.popularity])
    );

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
