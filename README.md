# service-finder-frontend-tenant

React + TypeScript business app for Service Finder — where a business signs
up, runs its team and decides what each person can do. Same stack, package
versions and structure as `igroom-frontend-tenant` and Service Finder's own back
office (the lockfile was seeded from the back office's, so every package
resolves to the same version), talking to `service-finder-backend`'s `/accounts`
and `/staff` routes.

**No business logic yet, on purpose.** Service Finder serves a different kind
of business from iGroom's salons, so none of iGroom's salon side came across —
no bookings, calendar, services, locations, POS, customers or plan/checkout
step. What's here is the part every business app needs whatever it sells:
identity, the team, roles & permissions, and a home page. Service Finder's own
areas get added on top (see "Adding an area").

## Stack, and why

| Concern            | Choice                            | Why                                                                                                                           |
| ------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Package manager    | **pnpm**                          | Same as the backend. Strict `node_modules` linking catches phantom imports that npm/yarn hoisting hides.                      |
| Build tool         | **Vite**                          | Native-ESM dev server, Rollup production build with tree-shaking and code splitting.                                          |
| Linting/formatting | **oxlint + oxfmt**                | Same tools and config as the backend and back office, plus the `react`, `react-perf` and `jsx-a11y` plugins.                  |
| Language           | **TypeScript, strict**            | `strict` plus `noUncheckedIndexedAccess`; `verbatimModuleSyntax` keeps Vite's per-file transpilation safe.                    |
| Routing            | **react-router v7** (data router) | Route-level code splitting via the `lazy` field — see `src/routes/router.tsx`.                                                |
| Server state       | **TanStack Query**                | Caching, dedup, retry and background refetch (`src/lib/query-client.ts`: 30s staleTime, no retry on 401/403/404).             |
| Client state       | **Zustand**                       | The session (`src/auth/auth-store.ts`, persisted) and sign-up's step-one answers (`src/auth/signup-store.ts`, memory only).   |
| Styling            | **Tailwind CSS v4**               | Design tokens in `src/styles/index.css`'s `@theme` — retheme from one file.                                                   |
| Google sign-in     | **Google Identity Services**      | Google's own rendered button (`src/lib/google-identity.ts`), as in iGroom's tenant app — it gets the ID token the API checks. |
| Tests              | **Vitest + Testing Library**      | Shares Vite's transform pipeline.                                                                                             |

## Signing in, and the session

- **Sign-up** is two steps. `/signup` asks who you are — Google, or a name, work
  email and password — and keeps the answers in memory only (never storage: they
  can hold a password or a Google token). `/signup/business` asks for the
  business's name and phone and calls `POST /accounts/signup`, which creates the
  business, its default roles (Owner, Manager, Member) and you as its owner in
  one go. A Google account that already has a business just signs in.
- **Sign-in** (`/login`) is Google or email and password. With two-factor on,
  either stops at a 6-digit code step (`POST /accounts/mfa/challenge`) before a
  session exists. A Google account with no business behind it is offered
  sign-up with it.
- **Invites.** Someone invited gets an email linking to `/invite#<token>`. The
  token sits in the URL fragment so it never reaches a server log; the page reads
  it once, wipes it from the address bar and exchanges it for a session. Links
  work once and for 7 days, and a fresh one retires the last. Because the link
  is now spent, `/welcome` won't let a new member leave until they've set a
  password or linked their Google account.
- **The session** is a 15-minute access token and a 30-day, single-use refresh
  token. `src/lib/http.ts` sends the token for every signed-in call and, on a
  401 marked `code: "TOKEN_INVALID"`, refreshes once (one shared refresh for
  calls that fail together — a refresh token works once) and retries. Every
  other 401 — a wrong password, a wrong 2FA code — is shown as it is; refreshing
  on those would retry the same wrong code and sign the person out over a typo.
  If the refresh fails too, the session is cleared and the browser goes to
  `/login`.

**Trade-off worth knowing about:** both tokens are persisted in localStorage
(`auth-store.ts`), as in iGroom's tenant app, so a reload stays signed in. An
httpOnly-cookie refresh token is the safer design; it's a backend change first.

## Roles & permissions

Each business has its own roles. Every business starts with:

| Role    | Permissions                                | Notes                                                    |
| ------- | ------------------------------------------ | -------------------------------------------------------- |
| Owner   | all of them                                | System role: can't be renamed, re-permissioned, deleted. |
| Manager | `staff.view`, `staff.manage`, `roles.view` | An ordinary role — edit or delete it freely.             |
| Member  | `staff.view`                               | Likewise.                                                |

The catalog: `staff.view`, `staff.manage`, `roles.view`, `roles.manage`,
`business.manage`. The backend enforces them on every route; the app mirrors
them so it only offers what will work:

- `src/auth/use-permissions.ts` — the caller's keys, from `GET /accounts/me`,
  cached in the store so a reload draws the right nav on its first frame.
- `src/auth/route-permissions.ts` — which page needs which key. The sidebar and
  the settings nav filter by it, and `AppShell` guards the route with it, so a
  hidden item and a blocked page can't disagree.
- `canReachRole` in `src/lib/roles-api.ts` — the backend's anti-escalation rule:
  **nobody but an owner can hand out a permission they don't hold**, or act on a
  role (or a member holding one) that grants more than they have; the Owner role
  and its holders are an owner's alone. The role editor greys out what you can't
  grant, role pickers list only what you can give, and rows you can't act on
  show no actions. The backend refuses all of it regardless.

## What's here

| Page                                      | Needs        | Does                                                                                                                                    |
| ----------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Home (`HomePage.tsx`)                     | signed in    | "Things need you" (2FA off, nobody invited, invites waiting, no phone), team and role figures, a roster preview, the business's details |
| Business profile (`BusinessSettingsPage`) | signed in    | Name, contact email, phone. Editing needs `business.manage`; the address (slug) is fixed at sign-up                                     |
| Users & roles (`TeamSettingsPage`)        | `staff.view` | Members: invite, resend, copy a setup link, edit name/role, deactivate/reactivate. Roles (needs `roles.view`): create, edit, delete     |
| My profile (`ProfileSettingsPage`)        | signed in    | Your name; your email and role, read-only                                                                                               |
| Security (`SecuritySettingsPage`)         | signed in    | Set/change password (emailed code, or authenticator code with 2FA on), two-factor on/off, signed-in devices and signing them out        |

Deactivating someone ends every session of theirs at once, and the backend
turns their very next request away.

### Adding an area

1. Its permission keys in the backend's `DEFAULT_PERMISSIONS`
   (`modules/staff-roles/staff-roles.service.ts`) — usually a `.view` and a
   `.manage`. Every Owner role gets new keys automatically at the API's next
   boot; add a label for the area in `RoleEditorModal.tsx`'s `AREA_LABELS`.
2. Its API wrapper in `src/lib/<area>-api.ts` (same shape as `staff-api.ts`;
   `auth: true` on every signed-in call).
3. Its page in `src/pages/`, using TanStack Query, with `PageHeader` and
   `PageBody` from `components/layout/PageHeader.tsx`.
4. A lazy route in `src/routes/router.tsx` under AppShell's children, its row in
   `AppShell.tsx`'s `NAV`, and its key in `src/auth/route-permissions.ts`.

## Setup

```bash
cp .env.example .env
# VITE_API_BASE_URL defaults to http://localhost:4000 (the backend's local port).
# VITE_GOOGLE_CLIENT_ID must be the backend's GOOGLE_CLIENT_ID exactly — the
# same OAuth client the back office uses — and http://localhost:5274 must be
# one of its Authorised JavaScript origins.

pnpm install
pnpm dev          # http://localhost:5274
```

The dev server runs on **5274** (beside the back office's 5273, clear of
iGroom's ports). The backend's default `CORS_ORIGINS` allows both; if your
backend `.env` sets `CORS_ORIGINS` explicitly, add `http://localhost:5274` to
it. Without an email provider (`RESEND_API_KEY` unset on the backend), invite
links and emailed codes are printed to the API's console instead — and the app
offers "Copy link" for invites.

Other scripts: `pnpm typecheck`, `pnpm lint` / `pnpm lint:fix`, `pnpm fmt` /
`pnpm fmt:check`, `pnpm test`, `pnpm build`, `pnpm analyze` (bundle breakdown in
`stats.html`). `pnpm install` on a git repo wires up the husky + lint-staged
pre-commit hook.

## Design

Built from the Business screens (B01–B28) and the sign-in screen (C25) of
`Platform Screen Pack.dc.html`, with colours, radii and type sizes measured from
the rendered mockup:

- **The frame** is B01's: a near-black sidebar (the business's tile and name,
  the nav, who's signed in) beside a white header bar and a warm paper body.
  Settings is B19's — a white section list with the selected item on a warm
  tint behind a teal bar.
- **Type:** Libre Franklin for everything you read; Roboto Mono, small and
  uppercase, for labels, table headers, status pills and captions.
- **Colour:** warm paper `#FDFBF7`, white cards, near-black ink `#16150F`, one
  deep teal `#0E7C66` for everything actionable, and B02's warm amber for "things
  need you". All of it is in `src/styles/index.css` as `tn-*` tokens.
- **Shapes:** rounded-rectangle buttons (10px in a header, 14px full-width on the
  sign-in screens) rather than the back office's pills; 12px inputs, 13–14px
  cards, 20px dialogs.

The building blocks live in `src/components/ui/` — `Button`, `Card`
(`CardRow`, `InlineError`, `InlineNotice`, `EmptyState`), `StatCard`,
`StatusPill`, `Tabs`, `Field`/`Select`, `Modal`, `OtpInput`, `Avatar`,
`Spinner`, `Wordmark`/`LogoTile` — plus `components/layout/` for `AppShell`,
`AuthLayout` and `PageHeader`.

Where the build differs from the mockups, on purpose:

- **Sign-in** is email and password or Google, not C25's phone code and
  passkey — that's what the backend supports today.
- **The sidebar** lists only what exists (Home, Team, Settings), not B01's
  dispatch, jobs and marketplace.
- **Screens the pack doesn't draw** (sign-up, invites, Users & roles, Security,
  dialogs) are composed from the same pieces.

Deploying: see [deploy/README.md](deploy/README.md).
