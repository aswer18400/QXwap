# QXwap

## Overview

Thai-language marketplace/swap platform. Users can list items they own and want to trade, send offers, chat in real-time, and manage their profile. Built as a mobile-first React web app connected to Supabase.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **Frontend**: React (JSX) + Vite — `artifacts/web-app`
- **Backend**: Supabase (auth, database, realtime, storage)
- **API Server**: Express 5 + PostgreSQL + Drizzle ORM — `artifacts/api-server` (legacy, unused by QXwap UI)

## Supabase Schema

Tables expected in Supabase:
- `profiles` — user profiles (id, username, display_name, avatar_url, location, rating, verified, total_swaps)
- `listings` — item listings (id, owner_id, have_title, have_desc, have_category, have_images[], condition, location, mode, want_title, want_desc, price, status)
- `offers` — swap offers (id, listing_id, sender_id, note, offer_items, cash_amount, status)
- `conversations` — chat threads (id, participant_a, participant_b, offer_id, last_message, last_at)
- `messages` — chat messages (id, conversation_id, sender_id, text, created_at)
- `user_credit_balance` — view/table (user_id, balance)
- `credit_ledger` — credit history (user_id, amount, created_at)
- Storage bucket: `listing-images`

## Architecture

The web app uses the **full HTML prototype** (`attached_assets/qxwap-mvp-v40-profile-tabs-safe_*.html`) directly as `artifacts/web-app/index.html`. Vite serves it as a static SPA. A small Supabase auth gate is injected at the top — users must log in/sign up before seeing the prototype.

Source HTML is preserved verbatim from the design prototype. To regenerate after design updates, run `node /tmp/inject_supabase.js`.

## Key Files

- `artifacts/web-app/index.html` — full QXwap prototype + Supabase auth gate (entry point)
- `artifacts/web-app/src/lib/supabase.js` — Supabase client + API functions (still available for future React-based screens)
- `artifacts/web-app/src/App.jsx` — legacy React app (no longer used; HTML prototype is the entry)

## Supabase Credentials

Stored directly in `src/lib/supabase.js` (anon key is public by design).
Project URL: `https://cpradtvneftyeflwjvmx.supabase.co`

## Key Commands

- `pnpm --filter @workspace/web-app run dev` — run frontend locally
- `pnpm --filter @workspace/api-server run dev` — run legacy API server
