import { ApiError } from "./http";

/** The message to show for a failed call: the API's own words when it sent some, a plain fallback otherwise. */
export function errorMessage(
  error: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError)
    return "Can't reach ServiceFinder right now. Check your connection.";
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
