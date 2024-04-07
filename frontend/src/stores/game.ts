import { GameData, GameState } from "@/lib/game";
import { createContext, useContext } from "react";

export const GameStateContext = createContext<GameState | undefined>(undefined);
export const GameDataContext = createContext<GameData | undefined>(undefined);

export function useGameState() {
    const state = useContext(GameStateContext);
    if (!state) throw new Error("GameStateContext not found");
    return state;
}

export function useGameData() {
    const data = useContext(GameDataContext);
    if (!data) throw new Error("GameDataContext not found");
    return data;
}
