import { Timeout } from "node_modules/@tanstack/react-router/dist/esm/utils";
import { spotify } from "./spotify";
import { UserProfile, Track } from "@spotify/web-api-ts-sdk";

export type SpotifyData = {
    profile: UserProfile;
    topTracks: Track[];
};

export type ClientboundMessage =
    | {
          type: "playerJoined";
          id: string;
      }
    | {
          type: "playerInfo";
          id: string;
          data: SpotifyData;
      }
    | {
          type: "lobbyInfo";
          lobbyId: string;
      };

export type ServerboundMessage =
    | {
          type: "registerPlayerInfo";
          data: SpotifyData;
      }
    | {
          type: "keepAlive";
      };

export async function createWsConnection(
    lobbyId: string | undefined,
    playerId?: string
) {
    const url = new URL(`${import.meta.env.VITE_LOBBY_API_URL}/ws`);
    if (lobbyId) {
        url.searchParams.set("lobby", lobbyId);
    }
    if (playerId) {
        url.searchParams.set("player", playerId);
    }

    return new Promise<WebSocket>((resolve, reject) => {
        const ws = new WebSocket(url);
        ws.onopen = () => resolve(ws);
        ws.onclose = (e) => reject(e);
    });
}

export class LobbyOwner {
    public players: {
        id: string;
        data: SpotifyData | undefined;
    }[] = [];

    emitter = new EventTarget();

    keepAliveInterval: Timeout;

    constructor(
        private ws: WebSocket,
        public lobbyId: string
    ) {
        this.onMessage = this.onMessage.bind(this);
        this.subscribePlayers = this.subscribePlayers.bind(this);
        ws.onmessage = this.onMessage;
        this.keepAliveInterval = setInterval(() => {
            this.send({ type: "keepAlive" });
        }, 1000 * 10);
    }

    send(msg: ServerboundMessage) {
        this.ws.send(JSON.stringify(msg));
    }

    onMessage(e: MessageEvent) {
        const msg = JSON.parse(e.data) as ClientboundMessage;

        switch (msg.type) {
            case "playerJoined":
                this.players = [
                    ...this.players,
                    { id: msg.id, data: undefined },
                ];
                break;
            case "playerInfo": {
                console.log(msg);
                const i = this.players.findIndex((p) => p.id === msg.id);
                if (i === -1) {
                    console.warn(
                        "Received playerInfo for unknown player",
                        msg.id
                    );
                    return;
                }

                this.players = [
                    ...this.players.slice(0, i),
                    { id: msg.id, data: msg.data },
                    ...this.players.slice(i + 1),
                ];
                break;
            }
        }
        console.log(this.players);

        this.emitter.dispatchEvent(new Event("update"));
    }

    subscribePlayers(fn: (lobby: LobbyOwner["players"]) => void) {
        const listener = () => fn(this.players);
        this.emitter.addEventListener("update", listener);
        return () => this.emitter.removeEventListener("update", listener);
    }

    close() {
        this.ws.close();
        clearInterval(this.keepAliveInterval);
    }
}

export async function createLobbyOwner() {
    const ws = await createWsConnection(undefined);
    return new Promise<LobbyOwner>((resolve) => {
        ws.onmessage = (e) => {
            const msg = JSON.parse(e.data) as {
                type: "lobbyInfo";
                id: string;
            };
            if (msg.type === "lobbyInfo") {
                resolve(new LobbyOwner(ws, msg.id));
            }
        };
    });
}

export async function createLobbyClient(lobbyId: string, playerId?: string) {
    const ws = await createWsConnection(lobbyId, playerId);
    return new Promise<LobbyClient>((resolve) => {
        if (playerId) {
            resolve(new LobbyClient(ws, lobbyId, playerId));
        } else {
            ws.onmessage = (e) => {
                const msg = JSON.parse(e.data) as ClientboundMessage;
                if (msg.type === "playerJoined") {
                    resolve(new LobbyClient(ws, lobbyId, msg.id));
                }
            };
        }
    });
}

export class LobbyClient {
    constructor(
        private ws: WebSocket,
        public lobbyId: string,
        public playerId: string
    ) {}

    sendInfo(data: SpotifyData) {
        this.ws.send(JSON.stringify({ type: "registerPlayerInfo", data }));
    }
}

export type LobbyJoinIntent = {
    lobbyId: string;
    playerId: string;
    expiresAt: number;
};

export function getLobbyJoinIntent(): LobbyJoinIntent | undefined {
    const data = localStorage.getItem("lobbyJoinIntent");
    if (!data) {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return JSON.parse(data) as any as LobbyJoinIntent;
}

export function setLobbyJoinIntent(intent: LobbyJoinIntent) {
    localStorage.setItem("lobbyJoinIntent", JSON.stringify(intent));
}
