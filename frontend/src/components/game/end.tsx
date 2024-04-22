import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { useGameData, useGameState } from "@/stores/game";
import { useSnapshot } from "valtio";
import { ProfilePicture } from "../ProfilePicture";
import { confetti } from "@tsparticles/confetti";
import { useInterval } from "react-use";
import { Crown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "../ui/button";
import { useEffect, useRef } from "react";

export function End() {
    const data = useGameData();
    const state = useGameState();
    const snap = useSnapshot(state);

    const sortedPlayers = data.players.sort(
        (a, b) =>
            snap.scoreByPlayer[b.profile.id] - snap.scoreByPlayer[a.profile.id]
    );

    const confettis = useRef<ReturnType<typeof confetti>[]>([]);
    useInterval(() => {
        async function fn() {
            if (document.hidden) return;

            confettis.current.push(
                confetti({
                    count: 50,
                    spread: -90,
                    origin: { y: 0 },
                    ticks: 20,
                    colors: ["hsl(142, 78%, 47%)"],
                })
            );
        }
        fn();
    }, 1000);
    useEffect(() => {
        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            for (const confetti of confettis.current) {
                confetti.then((c) => c?.destroy());
            }
        };
    });

    return (
        <Card className="h-full flex justify-center items-center text-center">
            <motion.div
                className="flex flex-col gap-12 z-10 items-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                    duration: 0.8,
                }}
            >
                <h1 className="text-5xl font-bold">
                    {sortedPlayers[0].profile.display_name} has won the game!
                </h1>

                <div className="flex items-end">
                    <div className="bg-[#242424] p-4 rounded-l-xl w-[192px] overflow-hidden flex flex-col items-center h-[220px] relative">
                        {sortedPlayers.length > 1 && (
                            <>
                                <ProfilePicture
                                    player={sortedPlayers[1]}
                                    size={128}
                                    className="rounded-full"
                                />
                                <h2 className="text-2xl font-bold whitespace-nowrap">
                                    {sortedPlayers[1].profile.display_name}
                                </h2>
                                <p className="text-lg font-bold text-white/60">
                                    {
                                        snap.scoreByPlayer[
                                            sortedPlayers[1].profile.id
                                        ]
                                    }
                                </p>
                            </>
                        )}
                        <div className="h-1 bg-slate-400 absolute bottom-0 right-0 left-0"></div>
                    </div>
                    <div className="bg-[#363636] p-4 rounded-t-xl w-[192px] flex flex-col gap-1 items-center h-[300px] relative">
                        <div className="relative">
                            <ProfilePicture
                                player={sortedPlayers[0]}
                                size={128}
                                className="rounded-full"
                            />
                            <Crown className="absolute -top-6 right-8 w-8 h-8 text-yellow-400 fill-current rotate-12" />
                        </div>
                        <h2 className="text-2xl font-bold whitespace-nowrap">
                            {sortedPlayers[0].profile.display_name}
                        </h2>
                        <p className="text-lg font-bold text-white/60">
                            {snap.scoreByPlayer[sortedPlayers[0].profile.id]}
                        </p>
                        <div className="h-1 bg-yellow-400 absolute bottom-0 right-0 left-0"></div>
                    </div>
                    <div className="bg-[#242424] p-4 rounded-r-xl w-[192px] overflow-hidden flex flex-col items-center h-[220px] relative">
                        {sortedPlayers.length > 2 && (
                            <>
                                <ProfilePicture
                                    player={sortedPlayers[2]}
                                    size={128}
                                    className="rounded-full"
                                />
                                <h2 className="text-2xl font-bold whitespace-nowrap">
                                    {sortedPlayers[2].profile.display_name}
                                </h2>
                                <p className="text-lg font-bold text-white/60">
                                    {
                                        snap.scoreByPlayer[
                                            sortedPlayers[2].profile.id
                                        ]
                                    }
                                </p>
                            </>
                        )}
                        <div className="h-1 bg-[#cd7f32] absolute bottom-0 right-0 left-0"></div>
                    </div>
                </div>

                {data.players.length > 3 && (
                    <table className="bg-[#242424] rounded-xl w-[576px] overflow-hidden font-bold text-lg">
                        <thead>
                            <tr className="bg-[#242424] rounded-xl border-b border-b-[#363636]">
                                <th className="px-4 py-3 text-left">Player</th>
                                <th className="px-4 py-3 text-right">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPlayers.slice(3).map((player) => (
                                <tr key={player.profile.id}>
                                    <td className="px-4 py-3 text-left">
                                        <ProfilePicture
                                            player={player}
                                            size={32}
                                            className="rounded-full inline-block mr-2"
                                        />
                                        {player.profile.display_name}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {snap.scoreByPlayer[player.profile.id]}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="w-[576px] flex justify-between">
                    <button
                        className={buttonVariants({
                            variant: "default",
                        })}
                        onClick={() => location.reload()}
                    >
                        Play again
                    </button>

                    <Link
                        to="/"
                        className={buttonVariants({
                            variant: "secondary",
                        })}
                    >
                        Back to menu
                    </Link>
                </div>
            </motion.div>
        </Card>
    );
}
