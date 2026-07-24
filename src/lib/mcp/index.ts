import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfileTool from "./tools/get-profile";
import listWalletsTool from "./tools/list-wallets";
import listTransactionsTool from "./tools/list-transactions";
import listNotificationsTool from "./tools/list-notifications";

// OAuth issuer must be the direct Supabase host (never the .lovable.cloud proxy).
// VITE_SUPABASE_PROJECT_ID is inlined at build time by Vite so the entry stays
// import-safe (no runtime env read at module load).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "exosky-mcp",
  title: "ExoSky",
  version: "0.1.0",
  instructions:
    "Tools to read the signed-in ExoSky user's profile, multi-currency wallet balances, transactions, and notifications. All tools act as the authenticated user via Supabase RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfileTool, listWalletsTool, listTransactionsTool, listNotificationsTool],
});