import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { playSplash } from "./splash";

createRoot(document.getElementById("root")!).render(<App />);
playSplash();

// PWA: register the minimal service worker in production builds only.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
