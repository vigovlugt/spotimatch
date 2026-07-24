import {
    DefaultResponseValidator,
    SpotifyApi,
    type IValidateResponses,
} from "@spotify/web-api-ts-sdk";

export type SpotifyAppIndex = 0 | 1;

const ACTIVE_SPOTIFY_APP_KEY = "activeSpotifyApp";
const spotifyClientIds = [
    import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    import.meta.env.VITE_SPOTIFY_CLIENT_ID_SECONDARY,
] as const;

class SpotifyResponseValidator implements IValidateResponses {
    private defaultValidator = new DefaultResponseValidator();

    async validateResponse(response: Response) {
        if (response.status === 403) {
            throw new SpotifyHttpError(response.status, await response.text());
        }

        return this.defaultValidator.validateResponse(response);
    }
}

export class SpotifyHttpError extends Error {
    constructor(
        public status: number,
        body: string
    ) {
        super(`Spotify request failed with status ${status}. Body: ${body}`);
        this.name = "SpotifyHttpError";
    }
}

const spotifyClients = spotifyClientIds.map((clientId) =>
    clientId
        ? SpotifyApi.withUserAuthorization(
              clientId,
              location.origin + "/spotify-callback",
              ["user-top-read"],
              { responseValidator: new SpotifyResponseValidator() }
          )
        : undefined
);

export function hasSecondarySpotifyApp() {
    return spotifyClients[1] !== undefined;
}

export function getActiveSpotifyApp(): SpotifyAppIndex {
    return localStorage.getItem(ACTIVE_SPOTIFY_APP_KEY) === "1" &&
        hasSecondarySpotifyApp()
        ? 1
        : 0;
}

export function setActiveSpotifyApp(appIndex: SpotifyAppIndex) {
    if (!spotifyClients[appIndex]) {
        throw new Error(`Spotify app ${appIndex + 1} is not configured`);
    }

    if (getActiveSpotifyApp() !== appIndex) {
        // The SDK uses one shared cache key for all PKCE tokens.
        spotifyClients[0]?.logOut();
        spotifyClients[1]?.logOut();
    }

    localStorage.setItem(ACTIVE_SPOTIFY_APP_KEY, appIndex.toString());
}

export function getSpotifyClient(appIndex: SpotifyAppIndex) {
    setActiveSpotifyApp(appIndex);

    return spotifyClients[appIndex]!;
}

export function isSpotifyForbidden(error: unknown) {
    return error instanceof SpotifyHttpError && error.status === 403;
}
