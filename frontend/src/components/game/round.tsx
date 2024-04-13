import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { useAudio, useInterval, useEvent } from "react-use";
import { useGameData, useGameState } from "@/stores/game";
import { useSnapshot } from "valtio";
import {
    RoundStage,
    advanceStage,
    assignWinnings,
    getMatches,
    getTrack,
} from "@/lib/game";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { PROD, cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useAdvanceStage } from "@/hooks";

export function Round() {
    const state = useGameState();
    const snap = useSnapshot(state);
    if (snap.stage.type !== "round") {
        throw new Error("Invalid stage type");
    }

    const Component = {
        intro: Intro,
        listen: Listen,
        submit: Submit,
        select: Select,
        "reveal-match": RevealMatch,
        leaderboard: Leaderboard,
    }[snap.stage.subStage];

    return <Component key={snap.stage.subStage} />;
}

function Intro() {
    const state = useGameState();
    const snap = useSnapshot(state);
    if (snap.stage.type !== "round" || snap.stage.subStage !== "intro") {
        throw new Error("Invalid stage type");
    }

    useAdvanceStage({ timeout: 3000 });

    return (
        <Card className="h-full flex justify-center items-center text-center">
            <motion.div
                className="flex flex-col gap-1"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                    duration: 0.8,
                }}
            >
                <h1 className="text-6xl font-bold">Round {snap.stage.round}</h1>
            </motion.div>
        </Card>
    );
}

function Listen() {
    const state = useGameState();
    const data = useGameData();
    const snap = useSnapshot(state);
    const track = getTrack(data.players, (snap.stage as RoundStage).trackId);
    const [audio, audioState, controls, ref] = useAudio({
        src: track.preview_url!,
        autoPlay: true,
        loop: false,
    });

    if (snap.stage.type !== "round" || snap.stage.subStage !== "listen") {
        throw new Error("Invalid stage type");
    }

    const { advance } = useAdvanceStage();

    useEffect(() => {
        const audioEl = ref.current!;
        audioEl.addEventListener("ended", advance);

        return () => {
            audioEl.removeEventListener("ended", advance);
        };
    }, [advance, ref]);

    useEvent("click", () => {
        controls.play();
    });

    const trackIsLoaded = audioState.buffered.length > 0;

    return (
        <>
            {audio}
            <Card className="h-full">
                <motion.div
                    className="flex flex-col gap-4 justify-center items-center h-full text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                        duration: 0.8,
                    }}
                >
                    <a
                        href={track.external_urls.spotify}
                        target="_blank"
                        className="flex flex-col items-center gap-4"
                    >
                        <img
                            src={track.album.images[0].url}
                            width={640}
                            height={640}
                            className="rounded-lg h-[640px] w-[640px] object-cover"
                        />
                        <h1 className="text-4xl font-bold">{track.name}</h1>
                        <h2 className="text-2xl text-white/60">
                            {track.artists.map((a) => a.name).join(", ")}
                        </h2>
                    </a>
                    <div className="w-full max-w-[626px] bg-[#4d4c4c] h-1 rounded-full">
                        <motion.div
                            className="bg-white h-full w-0 rounded-full"
                            animate={{
                                width: trackIsLoaded
                                    ? (audioState.time / audioState.duration) *
                                          100 +
                                      "%"
                                    : "0%",
                            }}
                            transition={{
                                ease: "linear",
                            }}
                        ></motion.div>
                    </div>
                </motion.div>
            </Card>
        </>
    );
}

function Select() {
    const state = useGameState();
    const data = useGameData();
    const snap = useSnapshot(state);
    const track = getTrack(data.players, (snap.stage as RoundStage).trackId);

    const [pointingTime, setPointingTime] = useState(5);

    useInterval(
        () => {
            setPointingTime((t) => t - 1);
        },
        pointingTime > 0 ? 1000 : null
    );

    useAdvanceStage({ timeout: 8000 });

    return (
        <div className="flex h-full gap-2">
            <Card className="grow shrink flex flex-col">
                {pointingTime > 0 ? (
                    <div className="flex flex-col h-full justify-center items-center gap-3">
                        <h2 className="text-4xl font-bold">
                            Who do you think this song belongs to?
                        </h2>
                        <h3 className="text-2xl font-bold">
                            Point in {pointingTime}
                        </h3>
                    </div>
                ) : (
                    <div className="flex h-full justify-center items-center">
                        <h2 className="text-6xl font-bold">Point!</h2>
                    </div>
                )}
            </Card>
            <Card className="grow-0 shrink-0 flex h-full flex-col justify-center items-center text-center gap-4 px-16">
                <a
                    href={track.external_urls.spotify}
                    target="_blank"
                    className="flex flex-col items-center gap-4"
                >
                    <img
                        src={track.album.images[0].url}
                        width={256}
                        height={256}
                        className="rounded-lg object-cover h-[256px] w-[256px]"
                    />
                    <h2 className="text-2xl font-bold max-w-[500px]">
                        {track.name}
                    </h2>
                    <h3 className="text-xl max-w-[500px] text-white/60">
                        {track.artists.map((a) => a.name).join(", ")}
                    </h3>
                </a>
            </Card>
        </div>
    );
}

function RevealMatch() {
    const state = useGameState();
    const data = useGameData();
    const snap = useSnapshot(state);
    if (snap.stage.type !== "round" || snap.stage.subStage !== "reveal-match") {
        throw new Error("Invalid stage type");
    }

    const track = getTrack(data.players, (snap.stage as RoundStage).trackId);

    const matches = getMatches(
        data.players,
        (snap.stage as RoundStage).trackId
    );

    useAdvanceStage({ timeout: 10000 });

    return (
        <Card className="h-full flex justify-center items-center text-center">
            <motion.div
                className="flex gap-4 flex-col items-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                    duration: 0.8,
                    delay: 3,
                }}
            >
                <div className="flex gap-3 justify-center">
                    {matches.map((match) => (
                        <div
                            className="flex flex-col gap-1.5"
                            key={match.profile.id}
                        >
                            <img
                                src={match.profile.images.at(-1)!.url}
                                height={256}
                                width={256}
                                className="rounded object-cover h-[256px] w-[256px]"
                            ></img>
                            <h3 className="text-2xl font-bold">
                                {match.profile.display_name}
                            </h3>
                        </div>
                    ))}
                </div>
                <Heart className="w-12 h-12 text-primary fill-current" />
                <a
                    href={track.external_urls.spotify}
                    target="_blank"
                    className="flex flex-col items-center gap-4"
                >
                    <img
                        src={track.album.images[0].url}
                        width={256}
                        height={256}
                        className="rounded-lg object-cover h-[256px] w-[256px]"
                    />
                    <h2 className="text-2xl font-bold max-w-[500px]">
                        {track.name}
                    </h2>
                    <h3 className="text-xl max-w-[500px] text-white/60">
                        {track.artists.map((a) => a.name).join(", ")}
                    </h3>
                </a>
            </motion.div>
        </Card>
    );
}

function Submit() {
    const state = useGameState();
    const data = useGameData();
    const snap = useSnapshot(state);
    const track = getTrack(data.players, (snap.stage as RoundStage).trackId);

    const [pointingTime, setPointingTime] = useState(PROD ? 5 : -3);

    useInterval(
        () => {
            setPointingTime((t) => t - 1);
        },
        pointingTime > -3 ? 1000 : null
    );

    const submit = () => {
        assignWinnings(state, data, [...winners]);
        advanceStage(data, state);
    };

    const [winners, setWinners] = useState(new Set<string>());

    return (
        <div className="flex h-full gap-2">
            <Card className="grow shrink flex flex-col">
                <div className="flex h-full justify-center items-center">
                    <div className="flex flex-col items-center gap-6">
                        <h2 className="text-4xl font-bold">Select winners</h2>
                        <div className="flex gap-4">
                            {data.players.map((player) => {
                                return (
                                    <motion.div
                                        key={player.profile.id}
                                        animate={{
                                            y: winners.has(player.profile.id)
                                                ? -10
                                                : 0,
                                        }}
                                    >
                                        <button
                                            key={player.profile.id}
                                            onClick={() =>
                                                setWinners((w) =>
                                                    w.has(player.profile.id)
                                                        ? new Set(
                                                              [...w].filter(
                                                                  (x) =>
                                                                      x !==
                                                                      player
                                                                          .profile
                                                                          .id
                                                              )
                                                          )
                                                        : new Set([
                                                              ...w,
                                                              player.profile.id,
                                                          ])
                                                )
                                            }
                                            className={cn(
                                                "rounded transition-[outline] outline outline-primary outline-0",
                                                winners.has(
                                                    player.profile.id
                                                ) && "outline-4"
                                            )}
                                        >
                                            <img
                                                src={
                                                    player.profile.images.at(
                                                        -1
                                                    )!.url
                                                }
                                                height={96}
                                                width={96}
                                                className="rounded object-cover h-[96px] w-[96px]"
                                            ></img>
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>

                        <Button onClick={submit} className="w-[96px]">
                            Submit
                        </Button>
                    </div>
                </div>
            </Card>
            <Card className="grow-0 shrink-0 flex h-full flex-col justify-center items-center text-center gap-4 px-16">
                <a
                    href={track.external_urls.spotify}
                    target="_blank"
                    className="flex flex-col items-center gap-4"
                >
                    <img
                        src={track.album.images[0].url}
                        width={256}
                        height={256}
                        className="rounded-lg object-cover h-[256px] w-[256px]"
                    />
                    <h2 className="text-2xl font-bold max-w-[500px]">
                        {track.name}
                    </h2>
                    <h3 className="text-xl max-w-[500px] text-white/60">
                        {track.artists.map((a) => a.name).join(", ")}
                    </h3>
                </a>
            </Card>
        </div>
    );
}

function Leaderboard() {
    const state = useGameState();
    const data = useGameData();
    const snap = useSnapshot(state);
    if (snap.stage.type !== "round" || snap.stage.subStage !== "leaderboard") {
        throw new Error("Invalid stage type");
    }

    const maxScore = Math.max(...Object.values(snap.scoreByPlayer), 1);
    const sortedPlayers = data.players.sort(
        (a, b) =>
            snap.scoreByPlayer[b.profile.id] - snap.scoreByPlayer[a.profile.id]
    );

    useAdvanceStage({ timeout: 15000 });

    return (
        <Card className="h-full flex justify-center items-center text-center">
            <motion.div
                className="flex flex-col gap-6 items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                    duration: 0.8,
                }}
            >
                <h1 className="text-5xl font-bold">Leaderboard</h1>
                <div className="flex gap-4">
                    {sortedPlayers.map((player) => {
                        const score = snap.scoreByPlayer[player.profile.id];
                        return (
                            <div
                                key={player.profile.id}
                                className="flex flex-col gap-2 justify-end h-[400px]"
                            >
                                <div
                                    className="bg-primary text-primary-foreground w-[64px] rounded h-full"
                                    style={{
                                        height:
                                            score === 0
                                                ? "4px"
                                                : `${(score / maxScore) * 328}px`,
                                    }}
                                >
                                    {score / maxScore >= 0.125 && (
                                        <div className="font-bold text-4xl mt-1">
                                            {score}
                                        </div>
                                    )}
                                </div>

                                <img
                                    src={player.profile.images[0].url}
                                    height={64}
                                    width={64}
                                    className="rounded-full object-cover h-[64px] w-[64px]"
                                ></img>
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </Card>
    );
}
