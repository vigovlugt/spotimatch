import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { useTimeoutFn, useAudio } from "react-use";
import { useGameData, useGameState } from "@/stores/game";
import { useSnapshot } from "valtio";
import { RoundStage } from "@/lib/game";

export function Round() {
    const state = useGameState();
    const snap = useSnapshot(state);
    if (snap.stage.type !== "round") {
        throw new Error("Invalid stage type");
    }

    const Component = {
        intro: Intro,
        listen: Listen,
        reveal: Intro,
        submit: Intro,
    }[snap.stage.subStage];

    return <Component />;
}

function Intro() {
    const state = useGameState();
    const snap = useSnapshot(state);
    if (snap.stage.type !== "round" || snap.stage.subStage !== "intro") {
        throw new Error("Invalid stage type");
    }

    useTimeoutFn(() => {
        (state.stage as RoundStage).subStage = "listen";
    }, 3000);

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
    const [audio, audioState, controls] = useAudio({
        src: data.players[0].topTracks[0].preview_url || "",
    });
    audioState;
    controls.play();

    useTimeoutFn(() => {
        controls.play();
    }, 2000);

    if (snap.stage.type !== "round" || snap.stage.subStage !== "listen") {
        throw new Error("Invalid stage type");
    }

    const track = data.players[0].topTracks[0];

    // useTimeoutFn(() => {
    //     (state.stage as RoundStage).subStage = "submit";
    // }, 30000);

    return (
        <>
            {audio}
            {track.preview_url}
            {JSON.stringify(audioState)}
            <Card className="h-full flex flex-col justify-center items-center text-center gap-4">
                <a
                    href={track.external_urls.spotify}
                    target="_blank"
                    className="flex flex-col items-center gap-4"
                >
                    <img
                        src={track.album.images[0].url}
                        width={640}
                        height={640}
                        className="rounded-lg"
                    />
                    <h1 className="text-4xl font-bold">{track.name}</h1>
                    <h2 className="text-2xl">
                        {track.artists.map((a) => a.name).join(", ")}
                    </h2>
                </a>
                <div className="w-full max-w-[626px] bg-[#4d4c4c] h-1 rounded-full">
                    <motion.div className="bg-white h-full w-1/3 rounded-full"></motion.div>
                </div>
            </Card>
        </>
    );
}
