import { Intro } from "@/components/game/intro";
import { Round } from "@/components/game/round";
import { getGameData, newGameState } from "@/lib/game";
import { GameDataContext, GameStateContext, useGameState } from "@/stores/game";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useRef } from "react";
import { toast } from "sonner";
import { proxy, useSnapshot } from "valtio";

export const Route = createFileRoute("/play")({
    loader: async () => {
        const gameData = getGameData();
        if (!gameData) {
            toast.error("No game data found");

            throw redirect({
                to: "/",
            });
        }

        return { gameData };
    },
    component: Play,
});

function Play() {
    const { gameData } = Route.useLoaderData();
    const state = useRef(proxy(newGameState(gameData.players))).current;

    return (
        <GameDataContext.Provider value={gameData}>
            <GameStateContext.Provider value={state}>
                <PlayInner />
            </GameStateContext.Provider>
        </GameDataContext.Provider>
    );
}

function PlayInner() {
    const gameState = useGameState();
    const snap = useSnapshot(gameState);

    const Component = {
        intro: Intro,
        end: Intro,
        round: Round,
    }[snap.stage.type];

    return <Component />;
}
