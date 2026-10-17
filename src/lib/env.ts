import { z } from "zod";

/**
 * Single source of truth for build-time env vars, the same pattern as
 * service-finder-backend's src/config/env.ts and the back office's own
 * env.ts — fail loudly at startup with a clear message instead of a
 * confusing runtime error the first time something reads an unset value.
 *
 * Vite only exposes `VITE_`-prefixed vars to client code, and inlines
 * them at build time via import.meta.env — so nothing here is secret.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url({ message: "VITE_API_BASE_URL must be a valid URL" }),
  // The same OAuth client as the backend's GOOGLE_CLIENT_ID — the backend
  // checks every Google ID token's audience against it.
  VITE_GOOGLE_CLIENT_ID: z.string().min(1, "VITE_GOOGLE_CLIENT_ID is required for Google sign-in"),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — check your .env file against .env.example");
}

export const env = parsed.data;
