import { motion } from "framer-motion";
import { Card } from "../ui/card";
// import { useGameState } from "@/stores/game";
// import { useSnapshot } from "valtio";

export function End() {
    // const state = useGameState();
    // const snap = useSnapshot(state);
    // snap;

    return (
        <Card className="h-full flex justify-center items-center text-center">
            <motion.div
                className="flex flex-col gap-1"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                    duration: 3,
                    delay: 0.5,
                }}
            >
                <h1 className="text-6xl font-bold">Final standings</h1>
            </motion.div>
        </Card>
    );
}
