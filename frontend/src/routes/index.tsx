import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
    component: Index,
});

function Index() {
    const [lobbyId, setLobbyId] = useState("");

    return (
        <div className="flex justify-center items-center h-full">
            <Card className="h-full w-full max-w-lg md:max-h-[40rem] flex flex-col gap-1.5 justify-between">
                <div className="flex justify-center items-center grow shrink">
                    <h1 className="text-4xl font-bold">SpotiMatch</h1>
                </div>
                <div className="flex flex-col gap-4 mb-1">
                    <div className="flex gap-1.5 flex-col">
                        <Label className="text-lg">Join game</Label>
                        <Input
                            placeholder="Game ID"
                            value={lobbyId}
                            onChange={(e) =>
                                setLobbyId(e.target.value.toUpperCase())
                            }
                        />
                        <Link
                            to={`/$id`}
                            params={{ id: lobbyId }}
                            className={cn(
                                buttonVariants({
                                    variant: "default",
                                }),
                                "w-full rounded-full"
                            )}
                        >
                            Join
                        </Link>
                    </div>

                    <div className="flex gap-1.5 flex-col">
                        <Label className="text-lg">Create game</Label>
                        <Link
                            to="/host"
                            className={cn(
                                buttonVariants({
                                    variant: "default",
                                }),
                                "w-full rounded-full"
                            )}
                        >
                            Create
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    );
}
