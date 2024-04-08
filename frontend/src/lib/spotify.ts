import { SpotifyApi } from "@spotify/web-api-ts-sdk";

export const spotify = SpotifyApi.withUserAuthorization(
    import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    location.origin + "/spotify-callback",
    ["user-top-read"]
);
