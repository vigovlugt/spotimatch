import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { useAdvanceStage } from "@/hooks";

export function Intro() {
    useAdvanceStage({ timeout: 5000 });

    return (
        <Card className="h-full flex justify-center items-center text-center">
            <motion.div
                className="flex flex-col gap-1"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                    duration: 3,
                }}
            >
                <h1 className="text-6xl font-bold">SpotiMatch</h1>
            </motion.div>
        </Card>
    );
}
