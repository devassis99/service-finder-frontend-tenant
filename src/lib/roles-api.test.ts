import { describe, expect, it } from "vitest";
import { canReachRole } from "./roles-api";

const manager = { isOwner: false, permissions: ["staff.view", "staff.manage", "roles.view"] };

describe("canReachRole — mirrors the backend's assertCovers", () => {
  it("lets an owner reach anything", () => {
    expect(
      canReachRole(
        { isSystem: true, permissions: ["business.manage"] },
        { isOwner: true, permissions: [] },
      ),
    ).toBe(true);
  });

  it("lets anyone else reach a role granting only what they hold", () => {
    expect(canReachRole({ isSystem: false, permissions: ["staff.view"] }, manager)).toBe(true);
    expect(canReachRole({ isSystem: false, permissions: [] }, manager)).toBe(true);
  });

  it("keeps a role granting more than they hold out of reach", () => {
    expect(
      canReachRole({ isSystem: false, permissions: ["staff.view", "roles.manage"] }, manager),
    ).toBe(false);
  });

  it("keeps the Owner role an owner's alone", () => {
    const everything = {
      isOwner: false,
      permissions: ["staff.view", "staff.manage", "roles.view", "roles.manage", "business.manage"],
    };
    expect(canReachRole({ isSystem: true, permissions: everything.permissions }, everything)).toBe(
      false,
    );
  });
});
