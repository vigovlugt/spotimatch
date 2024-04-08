import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { useTimeoutFn, useAudio, useInterval, useEvent } from "react-use";
import { useGameData, useGameState } from "@/stores/game";
import { useSnapshot } from "valtio";
import {
    RoundStage,
    assignWinnings,
    getMatches,
    getTrack,
    newRoundState,
} from "@/lib/game";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { PROD, cn } from "@/lib/utils";
import { ArrowDown, CircleCheck, Heart } from "lucide-react";

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
        "reveal-match": RevealMatch,
        "reveal-picks": RevealPicks,
        leaderboard: Leaderboard,
    }[snap.stage.subStage];

    return <Component />;
}

function Intro() {
    const state = useGameState();
    const snap = useSnapshot(state);
    if (snap.stage.type !== "round" || snap.stage.subStage !== "intro") {
        throw new Error("Invalid stage type");
    }

    useTimeoutFn(
        () => {
            (state.stage as RoundStage).subStage = "listen";
        },
        PROD ? 3000 : 0
    );

    return (
        <Card className="h-full flex justify-center items-center text-center">
            <motion.div
                className="flex flex-col gap-1"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                    duration: 0.8,
                    delay: 0.5,
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

    useEffect(() => {
        ref.current!.addEventListener("ended", () => {
            (state.stage as RoundStage).subStage = "submit";
        });
        assignWinnings(state, data);
    }, [data, ref, state, state.stage]);

    useEvent("click", () => {
        controls.play();
    });

    if (!PROD) {
        (state.stage as RoundStage).subStage = "submit";
    }

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
                        delay: 0.5,
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

function Submit() {
    const state = useGameState();
    const data = useGameData();
    const snap = useSnapshot(state);
    const track = getTrack(data.players, (snap.stage as RoundStage).trackId);

    const [pointingTime, setPointingTime] = useState(PROD ? 10 : -3);

    useInterval(
        () => {
            setPointingTime((t) => t - 1);
        },
        pointingTime > -3 ? 1000 : null
    );

    const submit = () => {
        (state.stage as RoundStage).subStage = "reveal-match";
    };

    const pickByPlayer = (snap.stage as RoundStage).pickByPlayer;

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
                ) : pointingTime > -3 ? (
                    <div className="flex h-full justify-center items-center">
                        <h2 className="text-6xl font-bold">Point!</h2>
                    </div>
                ) : (
                    <motion.div className="flex flex-col h-full gap-4">
                        <h2 className="text-3xl font-bold">Submit choices</h2>
                        {data.players.map((player) => (
                            <div
                                key={player.profile.id}
                                className="flex flex-col gap-1.5"
                            >
                                <h3 className="text-2xl font-bold">
                                    {player.profile.display_name}
                                    <span className="text-white/60">
                                        {pickByPlayer[player.profile.id]
                                            ? ": " +
                                              data.players.find(
                                                  (p) =>
                                                      p.profile.id ===
                                                      pickByPlayer[
                                                          player.profile.id
                                                      ]
                                              )!.profile.display_name
                                            : ""}
                                    </span>
                                </h3>
                                <div className="flex gap-1.5">
                                    {data.players.map((p) => (
                                        <button
                                            key={p.profile.id}
                                            onClick={() => {
                                                (
                                                    state.stage as RoundStage
                                                ).pickByPlayer = {
                                                    ...(
                                                        snap.stage as RoundStage
                                                    ).pickByPlayer,
                                                    [player.profile.id]:
                                                        p.profile.id,
                                                };
                                            }}
                                            className={cn(
                                                "rounded",
                                                (snap.stage as RoundStage)
                                                    .pickByPlayer[
                                                    player.profile.id
                                                ] === p.profile.id
                                                    ? "outline-primary outline"
                                                    : ""
                                            )}
                                        >
                                            <img
                                                src={p.profile.images[0].url}
                                                height={64}
                                                width={64}
                                                className="rounded object-cover h-[64px] w-[64px]"
                                            ></img>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <Button onClick={submit} className="w-[96px]">
                            Submit
                        </Button>
                    </motion.div>
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

    const matchIds = getMatches(
        data.players,
        (snap.stage as RoundStage).trackId
    );
    const matches = matchIds.map(
        (id) => data.players.find((p) => p.profile.id === id.profile.id)!
    );

    useTimeoutFn(
        () => {
            (state.stage as RoundStage).subStage = "reveal-picks";
        },
        PROD ? 10000 : 0
    );

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

function RevealPicks() {
    const state = useGameState();
    const data = useGameData();
    const snap = useSnapshot(state);
    if (snap.stage.type !== "round" || snap.stage.subStage !== "reveal-picks") {
        throw new Error("Invalid stage type");
    }

    const matchIds = getMatches(
        data.players,
        (snap.stage as RoundStage).trackId
    ).map((p) => p.profile.id);

    useTimeoutFn(
        () => {
            if ((state.stage as RoundStage).round % 5 === 0) {
                (state.stage as RoundStage).subStage = "leaderboard";
            } else {
                state.stage = newRoundState(
                    data.players,
                    state.previousSongs,
                    (snap.stage as RoundStage).round
                );
            }
        },
        PROD ? 5000 * 100000 : 0
    );

    return (
        <Card className="h-full flex justify-center items-center text-center">
            <motion.div
                className="flex gap-4 flex-col"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                    duration: 0.8,
                    delay: 0.5,
                }}
            >
                <div className="flex gap-3 justify-center">
                    {data.players.map((player) => {
                        const pickedId = (snap.stage as RoundStage)
                            .pickByPlayer[player.profile.id];
                        const isCorrect =
                            matchIds.find((id) => id === pickedId) !==
                            undefined;

                        return (
                            <div
                                className="flex flex-col gap-1.5 relative"
                                key={player.profile.id}
                            >
                                <img
                                    src={player.profile.images.at(-1)!.url}
                                    height={128}
                                    width={128}
                                    className={cn(
                                        "rounded object-cover h-[128px] w-[128px]",
                                        isCorrect && "ring ring-primary"
                                    )}
                                ></img>
                                <h3 className="text-md font-bold max-w-[128px] overflow-hidden text-ellipsis">
                                    {player.profile.display_name}
                                </h3>
                                {isCorrect && (
                                    <CircleCheck className="absolute top-0 right-0 w-7 h-7 p-0.5 text-primary bg-green-100 rounded-full" />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="flex gap-3 justify-center">
                    {data.players.map(() => (
                        <div className="w-[128px] flex items-center justify-center">
                            <ArrowDown className="w-10 h-10 text-white" />
                        </div>
                    ))}
                </div>
                <div className="flex gap-3 justify-center">
                    {data.players.map((player) => {
                        const pickedId = (snap.stage as RoundStage)
                            .pickByPlayer[player.profile.id];
                        const picked = data.players.find(
                            (p) => p.profile.id === pickedId
                        );

                        return (
                            <div
                                className="flex flex-col gap-1.5 w-[128px]"
                                key={player.profile.id}
                            >
                                {picked === undefined ? (
                                    <>
                                        <h3 className="text-md font-bold w-full max-w-[128px] overflow-hidden text-ellipsis">
                                            No pick
                                        </h3>
                                    </>
                                ) : (
                                    <>
                                        <img
                                            src={
                                                picked.profile.images.at(-1)!
                                                    .url
                                            }
                                            height={128}
                                            width={128}
                                            className="rounded object-cover h-[128px] w-[128px]"
                                        ></img>
                                        <h3 className="text-md font-bold w-full max-w-[128px] overflow-hidden text-ellipsis">
                                            {picked.profile.display_name}
                                        </h3>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </Card>
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

    useTimeoutFn(
        () => {
            state.stage = newRoundState(
                data.players,
                state.previousSongs,
                (snap.stage as RoundStage).round
            );
        },
        PROD ? 15000 : 0
    );

    return (
        <Card className="h-full flex justify-center items-center text-center">
            <motion.div
                className="flex gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                    duration: 0.8,
                    delay: 0.5,
                }}
            >
                {sortedPlayers.map((player) => {
                    const score = snap.scoreByPlayer[player.profile.id];
                    return (
                        <div
                            key={player.profile.id}
                            className="flex flex-col gap-2 justify-end h-[400px]"
                        >
                            <div
                                className="bg-primary w-[64px] rounded h-full"
                                style={{
                                    height:
                                        score === 0
                                            ? "4px"
                                            : `${(score / maxScore) * 328}px`,
                                }}
                            />

                            <img
                                src={player.profile.images[0].url}
                                height={64}
                                width={64}
                                className="rounded-full object-cover h-[64px] w-[64px]"
                            ></img>
                        </div>
                    );
                })}
            </motion.div>
        </Card>
    );
}
