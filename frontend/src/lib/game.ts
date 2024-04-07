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
    subStage: "intro" | "listen" | "submit" | "reveal";
    pickByPlayer: Record<string, string>;
    song: string;
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
