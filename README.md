# HolyProjection

A modern, dual-view church presentation engine built for instant, real-time
collaboration. Drive live projector screens, plan service setlists, and fix typos
on the fly — with changes propagating to every connected screen in real time.

Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4**,
**Supabase** (auth + realtime) and the **Google Gemini API** (AI translation).

## Features

- **Presenter Dashboard** — manage presentations, edit slides live, control settings (fonts, alignment, transitions, overlays).
- **Projector & Stage screens** — full-screen output (`/projector`) and a confidence monitor (`/projector/stage`).
- **Service Setlist planner** — order multiple songs/readings into a single service flow.
- **Congregation follow mode** (`/follow`) — members follow lyrics live on their phones via a shared link / QR code.
- **Mobile remote** — advance slides from a phone.
- **Bilingual slides** with **AI translation to Arabic** (Google Gemini, with a rule-based offline fallback).
- **Live alerts & nursery calls** broadcast to the projector.
- **Realtime presence** — see which presenters are online and collaborate concurrently.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/login` | Presenter sign-in (Supabase Auth) |
| `/dashboard` | Presenter portal & live control board |
| `/dashboard/liturgy` | Liturgy importer |
| `/dashboard/setlist` | Service setlist planner |
| `/dashboard/import` | AI bulk importer |
| `/dashboard/remote` | Mobile remote controller |
| `/projector` | Live projector output |
| `/projector/stage` | Stage / confidence monitor |
| `/follow` | Congregation live-follow screen |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Create a `.env.local` (see `.env.example`):

```bash
# Required — Supabase project (Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional — enables AI translation/import. Without it, a rule-based demo
# translator is used instead. Get a key at https://aistudio.google.com/apikey
GEMINI_API_KEY=your-gemini-key
```

> Without Supabase configured, the app runs in an **offline demo mode** that stores
> data in `localStorage` and syncs across browser tabs via `BroadcastChannel`.

## Database

The app expects these Supabase tables: `presentations`, `slides`, `setlists`,
`setlist_items`, `active_projection`. **Row Level Security must be enabled** on all
of them. The public anon key allows read access (needed by the projector/follow
screens) and write access is restricted to authenticated presenters.

## Deployment

Deployed on [Vercel](https://vercel.com). Pushing to `main` triggers a production
deploy. Set the environment variables above in **Vercel → Project → Settings →
Environment Variables** for Production and Preview.

```bash
npm run build   # production build
npm run lint    # lint
```
