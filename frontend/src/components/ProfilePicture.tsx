import { SpotifyData } from "@/lib/lobby";
import { cn, colorByPlayer } from "@/lib/utils";
import { ComponentProps } from "react";

export function ProfilePicture({
    player,
    size,
    ...props
}: { player: SpotifyData; size: number } & (ComponentProps<"img"> &
    ComponentProps<"div">)) {
    if (!player.profile.images.length) {
        const firstLetters = player.profile.display_name
            .split(" ")
            .filter(Boolean)
            .map((word) => word[0])
            .slice(0, 2)
            .join("");

        const color = colorByPlayer(player);

        return (
            <div
                {...props}
                style={{
                    height: size + "px",
                    width: size + "px",
                    backgroundColor: color,
                    ...props.style,
                }}
                className={cn(
                    "text-4xl flex items-center justify-center font-bold",
                    ["#22c55e", "#84cc16", "#eab308", "#f59e0b"].includes(
                        color
                    ) && "text-black",
                    props.className
                )}
            >
                {firstLetters}
            </div>
        );
    }

    const img =
        size <= 64
            ? player.profile.images.at(0)!
            : player.profile.images.at(-1)!;

    return (
        <img
            src={img.url}
            alt={player.profile.display_name}
            width={size}
            height={size}
            {...props}
            style={{
                width: size,
                height: size,
                objectFit: "cover",
                ...props.style,
            }}
        />
    );
}
