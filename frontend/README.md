# SHRAM — Frontend (Phase 1)

This is a production-grade Next.js 15 + React 19 + TypeScript frontend foundation for SHRAM,
India's smart labour hiring platform.

## What's included in this delivery

**Architecture**
- Next.js 15 App Router, route groups for `(auth)`, `(worker)`, `(provider)`
- Redux Toolkit + RTK Query as the *only* data-fetching layer (no axios-in-components anywhere)
- Auth header injection + automatic 401 → refresh-token → retry flow, with a mutex so concurrent
  401s don't trigger duplicate refresh calls
- Socket.IO provider wired for `newInstantRequest`, `bookingUpdated`, `notification`, `dashboardRefresh`
- Live location hook (`useLiveLocation`) using the browser Geolocation API, posting to
  `/location/update` every 10s, active only when a worker is online
- Full shadcn-style UI primitives built by hand (button, card, input, dialog, dropdown, select,
  tabs, switch, skeleton, tooltip, popover, scroll-area, checkbox, sonner toast, etc.) on Tailwind v4
  with the SHRAM design tokens (Deep Emerald primary, Orange accent, 16px radius, soft shadows)
- Framer Motion throughout: page transitions, card hovers, ripple buttons, animated empty states,
  the booking timeline, and the instant-request countdown/pulse

**Pages built and verified (production build passes for all of them)**
- Landing page (hero, features, categories, CTA, footer)
- Auth: login, signup (role select), OTP verification, forgot/reset password
- Worker dashboard, Provider dashboard (with recharts trend chart)
- Job feed (search/filter/sort/infinite scroll), job detail + apply, applications tracker
- Create Job, My Jobs, Applicants overview, per-job applicants + accept flow
- **Instant Hire flow** (the hero feature): request form -> animated "searching nearby workers"
  ripple screen -> confirmation, plus the **full-screen Uber-style accept/decline popup** with a
  30s countdown, sound, and socket-driven delivery -- wired globally so it can pop up from anywhere
  in the worker app
- Bookings (list + detail with animated status timeline, start/complete actions, review dialog)
- Profile (worker + provider), Settings (password change, theme, notifications, delete account)
- 404 and global error pages

## Running it

```bash
npm install
npm run dev
```

Create a `.env.local` if you need to point at a different backend:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

The app expects your backend to be running at that base URL with the exact routes you supplied
(`/auth/*`, `/users/*`, `/workers/*`, `/providers/*`, `/dashboard/*`, `/skills/*`, `/jobs/*`,
`/booking/*`, `/instant-request/*`, `/reviews/*`, `/location/*`). No endpoints were invented --
where the spec didn't provide a route (e.g. a "reviews given by provider" listing), the page is
left with a clearly marked `// TODO` instead of a fake call.

## What's not in this delivery yet

This was Phase 1 of the build. Not yet built: notification REST history (only realtime via socket
is wired, since no REST notification endpoints were specified), real map integration (placeholder
card is in booking detail, ready for a Maps SDK), and the deeper polish pass (skeleton states on
every single page, more micro-animations, PWA/offline). Happy to keep going on any of these next --
just say which one to prioritize.
