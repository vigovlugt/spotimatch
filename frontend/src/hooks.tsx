import { useKey, useTimeoutFn } from "react-use";
import { advanceStage } from "./lib/game";
import { useGameData, useGameState } from "./stores/game";

export function useAdvanceStage({ timeout }: { timeout?: number } = {}) {
    const data = useGameData();
    const state = useGameState();

    useKey(" ", () => {
        advanceStage(data, state);
    });

    useTimeoutFn(
        timeout
            ? () => {
                  advanceStage(data, state);
              }
            : () => {},
        timeout
    );

    return {
        advance: () => advanceStage(data, state),
    };
}
