import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/index.css";

window.addEventListener("unhandledrejection", (event) => {
  console.error("[QXwap] Unhandled promise rejection", event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
