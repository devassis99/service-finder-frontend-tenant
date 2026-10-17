import { describe, expect, it } from "vitest";
import { initials, plural, timeAgo } from "./format";

describe("timeAgo", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it("reads like a person would say it", () => {
    expect(timeAgo(ago(20_000), now)).toBe("Just now");
    expect(timeAgo(ago(5 * 60_000), now)).toBe("5 min ago");
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe("3 h ago");
    expect(timeAgo(ago(30 * 3_600_000), now)).toBe("Yesterday");
    expect(timeAgo(ago(4 * 86_400_000), now)).toBe("4 days ago");
  });

  it("says Never for someone who hasn't signed in", () => {
    expect(timeAgo(null, now)).toBe("Never");
  });
});

describe("initials", () => {
  it("takes the first and last name's first letters", () => {
    expect(initials("Amara Okafor")).toBe("AO");
    expect(initials("Jordan de la Rivera")).toBe("JR");
    expect(initials("jo")).toBe("J");
    expect(initials("  ")).toBe("?");
  });
});

describe("plural", () => {
  it("picks the word by count", () => {
    expect(plural(1, "person", "people")).toBe("1 person");
    expect(plural(0, "person", "people")).toBe("0 people");
  });
});
