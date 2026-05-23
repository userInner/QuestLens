import React from "react";
import {createRoot} from "react-dom/client";

import App from "./App.js";
import {saveDataRequirement} from "./lib/dataRequirementStore.js";
import "./styles.css";

// On first load, hydrate localStorage with seed DataRequirements that the
// seed-marketplace.ts script wrote into public/seed-tasks.json. This is a
// demo shortcut; in production these come from IPFS via the Requester's
// off-chain storage of choice.
async function loadSeedTasks() {
  try {
    const res = await fetch("/seed-tasks.json");
    if (!res.ok) return;
    const seed = (await res.json()) as Record<string, unknown>;
    for (const [hash, dr] of Object.entries(seed)) {
      saveDataRequirement(hash, dr as never);
    }
  } catch {
    // No seed file is fine - the user can post their own tasks.
  }
}
void loadSeedTasks();

const container = document.getElementById("root");
if (!container) throw new Error("#root not found");
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
