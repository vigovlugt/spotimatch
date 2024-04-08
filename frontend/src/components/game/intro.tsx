import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { useTimeoutFn } from "react-use";
import { useGameData, useGameState } from "@/stores/game";
import { PROD } from "@/lib/utils";
import { newRoundState } from "@/lib/game";

export function Intro() {
    const state = useGameState();
    const data = useGameData();

    useTimeoutFn(
        () => {
            state.stage = newRoundState(data.players, state.previousSongs, 0);
        },
        PROD ? 5000 : 0
    );

    return (
        <Card className="h-full flex justify-center items-center text-center">
            <motion.div
                className="flex flex-col gap-1"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                    duration: 3,
                    delay: 0.5,
                }}
            >
                <h1 className="text-6xl font-bold">SpotiMatch</h1>
            </motion.div>
        </Card>
    );
}
