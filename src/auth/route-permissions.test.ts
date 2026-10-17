import { describe, expect, it } from "vitest";
import { requiredPermissionFor } from "./route-permissions";

describe("requiredPermissionFor", () => {
  it("gates the team page and anything under it", () => {
    expect(requiredPermissionFor("/settings/team")).toBe("staff.view");
    expect(requiredPermissionFor("/settings/team/roles")).toBe("staff.view");
  });

  it("leaves everyone's own pages open", () => {
    for (const path of ["/home", "/settings/business", "/settings/profile", "/settings/security"]) {
      expect(requiredPermissionFor(path)).toBeNull();
    }
  });

  it("matches whole path segments, not prefixes of words", () => {
    expect(requiredPermissionFor("/settings/teams")).toBeNull();
  });
});
