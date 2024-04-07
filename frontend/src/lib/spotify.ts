import { SpotifyApi } from "@spotify/web-api-ts-sdk";

export const spotify = SpotifyApi.withUserAuthorization(
    import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    "http://localhost:5173/spotify-callback",
    ["user-top-read"]
);
