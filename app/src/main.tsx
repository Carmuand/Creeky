import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/index.css";
import App from "@/App";

const stored = localStorage.getItem("creeky-theme") as "light" | "dark" | null;
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const initial = stored ?? (prefersDark ? "dark" : "light");
document.documentElement.setAttribute("data-theme", initial);
document.documentElement.classList.toggle("dark", initial === "dark");
document.documentElement.style.colorScheme = initial;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
