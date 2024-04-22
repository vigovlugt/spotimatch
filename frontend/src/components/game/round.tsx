import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { useAudio, useInterval, useEvent, useTimeoutFn } from "react-use";
import { useGameData, useGameState } from "@/stores/game";
import { useSnapshot } from "valtio";
import {
    GameState,
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
import { ProfilePicture } from "../ProfilePicture";

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
                            src={track.album.images.at(0)?.url}
                            alt={track.name}
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
                        src={track.album.images.at(0)?.url}
                        alt={track.name}
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
                    {matches.map((match) => {
                        const songPosition = match.topTracks.findIndex(
                            (song) => song.id === track.id
                        );

                        return (
                            <div
                                className="flex flex-col gap-1.5 relative"
                                key={match.profile.id}
                            >
                                <ProfilePicture
                                    player={match}
                                    size={256}
                                    className="rounded"
                                ></ProfilePicture>
                                <h3 className="text-2xl font-bold">
                                    {match.profile.display_name}
                                </h3>
                                <motion.div
                                    className="absolute p-2 font-bold text-lg bg-blue-500 -right-5 -top-5 rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{
                                        delay: 5,
                                        duration: 0.5,
                                    }}
                                >
                                    #{songPosition + 1}
                                </motion.div>
                            </div>
                        );
                    })}
                </div>
                <Heart className="w-12 h-12 text-primary fill-current" />
                <a
                    href={track.external_urls.spotify}
                    target="_blank"
                    className="flex flex-col items-center gap-4"
                >
                    <img
                        src={track.album.images.at(0)?.url}
                        alt={track.name}
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
    const state = useGameState() as GameState<RoundStage>;
    const data = useGameData();
    const snap = useSnapshot(state);
    const track = getTrack(data.players, snap.stage.trackId);

    const matches = getMatches(data.players, snap.stage.trackId);

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
                                            <ProfilePicture
                                                player={player}
                                                size={96}
                                                className="rounded"
                                            />
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
            <Card className="grow-0 shrink-0 flex h-full flex-col justify-center items-center text-center gap-6 px-16">
                {matches.map((match) => (
                    <ProfilePicture
                        player={match}
                        size={128}
                        className="rounded"
                        key={match.profile.id}
                    ></ProfilePicture>
                ))}
                <a
                    href={track.external_urls.spotify}
                    target="_blank"
                    className="flex flex-col items-center gap-4"
                >
                    <img
                        src={track.album.images.at(0)?.url}
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
    const [scoreByPlayer, setScoreByPlayer] = useState(
        snap.previousScoreByPlayer
    );
    if (snap.stage.type !== "round" || snap.stage.subStage !== "leaderboard") {
        throw new Error("Invalid stage type");
    }

    const targetScore = data.targetScore;
    const sortedPlayers = data.players.sort(
        (a, b) => scoreByPlayer[b.profile.id] - scoreByPlayer[a.profile.id]
    );

    const hasWon =
        Math.max(...Object.values(snap.scoreByPlayer)) >= targetScore;

    useTimeoutFn(() => {
        setScoreByPlayer(snap.scoreByPlayer);
    }, 2000);

    useAdvanceStage({ timeout: hasWon ? 3500 : 5000 });

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
                <div>
                    <h1 className="text-5xl font-bold">Leaderboard</h1>
                    <h3 className="text-xl font-bold text-white/70">
                        First to {targetScore}
                    </h3>
                </div>
                <div className="flex">
                    <motion.div
                        className="flex flex-col gap-4 pt-6"
                        layout
                        transition={{
                            duration: 0.8,
                        }}
                    >
                        {sortedPlayers.map((player) => {
                            const score = scoreByPlayer[player.profile.id];
                            const width =
                                score === 0
                                    ? "4px"
                                    : `${(score / targetScore) * 728}px`;
                            return (
                                <div
                                    key={player.profile.id}
                                    className="flex gap-2 justify-start w-[800px]"
                                >
                                    <ProfilePicture
                                        size={64}
                                        player={player}
                                        className="rounded-full"
                                    />

                                    <motion.div
                                        className="bg-primary text-primary-foreground h-[64px] rounded overflow-hidden flex items-center justify-end"
                                        initial={{
                                            width,
                                        }}
                                        animate={{
                                            width,
                                        }}
                                        transition={{
                                            duration: 1,
                                        }}
                                    >
                                        {score >= 1 && (
                                            <div
                                                className={cn(
                                                    "font-bold text-4xl transition leading-none",
                                                    score >= 2 && "mr-2"
                                                )}
                                            >
                                                {score}
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                            );
                        })}
                    </motion.div>
                    <div className="flex flex-col items-center">
                        <span className="h-6 text-lg font-bold grow-0 shrink-0 text-primary absolute">
                            Finish
                        </span>
                        <div className="w-[2px] bg-primary grow shrink mt-6" />
                    </div>
                </div>
            </motion.div>
        </Card>
    );
}
