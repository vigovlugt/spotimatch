import ReactDOM from "react-dom/client";
import "./index.css";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { Toaster } from "sonner";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

// Spotify redirects to localhost
if (import.meta.env.DEV && location.hostname === "127.0.0.1") {
    location.href = location.origin.replace("127.0.0.1", "localhost");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <>
        <Toaster richColors />
        <RouterProvider router={router} />
    </>
);
