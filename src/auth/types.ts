/**
 * Who is signed in, as much as the shell needs to draw itself on the
 * first frame after a reload (sidebar business name, account menu) —
 * mirrored from GET /accounts/me and persisted with the tokens. The
 * query is still the source of truth; this is only what it last said.
 */
export interface SessionMember {
  id: string;
  name: string;
  email: string;
  roleName: string;
  isOwner: boolean;
  businessName: string;
}
