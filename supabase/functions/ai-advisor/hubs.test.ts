import { assert } from "jsr:@std/assert";
import { route } from "./orchestrator.ts";

// Mirrors HUB_TOOLS prompts in src/lib/exoChat.ts and mobile/src/exo/lib.ts: each must reach the agents with the live tools it needs.
Deno.test("Money hub prompts route to the right agents", () => {
  assert(route("Check my portfolio risk and allocation against my Governor limits", "money").agents.includes("governor"));
  assert(route("Run a Monte Carlo simulation of my savings over 5 years", "money").agents.includes("quant"));
  assert(route("What is the macro posture right now and what does it mean for my risk?", "money").agents.includes("governor"));
  assert(route("What is my net worth? Run an accounting check on my accounts", "money").agents.includes("wealth"));
});
Deno.test("Life hub prompts stay in the Life agent", () => {
  assert(route("Plan a weekend trip to Lisbon", "life").agents.includes("life"));
});
