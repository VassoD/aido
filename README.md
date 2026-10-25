# Aido

AI volunteer matching. A volunteer says in a few words where they are, what they like or know how to do and how much time they have; Aido finds real missions that fit, and writes their application for them. Associations post a mission in two minutes from a plain description or their old PDF form, and receive applications that are ready to read. No external sites, no PDF forms.

Built for the OpenAI DevDay Community Hackathon, Paris (Impact track). France first, designed to work in any country.

## What it does

**Volunteers** (no account needed to search)
- Chat in French or English. Aido turns the conversation into criteria (place, availability, skills, causes, commitment) shown as removable tags.
- Searches live sources in parallel: missions posted on Aido, JeVeuxAider.gouv.fr and Service Civique, plus GPT web search for local associations and other platforms. Every web link is fetched before it is shown.
- Ranks 3 to 5 missions with a personal reason and a commitment gauge (once, a few weeks, several months). Missions posted on Aido come first.
- **Applies for you**: Aido asks only the missing answers, then writes the application (answers + motivation) as an editable card. The volunteer sends it with one click; sign-in is an email link at that moment.
- **My space** (`/me`): applications with their replies and messages, saved missions kept per account, badges for applications, completed missions and causes, and a profile (city, LinkedIn, about) plus the interests Aido learned from the chat. Everything learned is editable.

**Associations**
- Sign in by email link, then enter an RNA or SIREN: Aido checks the official register (API Recherche d'Entreprises) and shows a Verified badge.
- Describe the need or upload the old PDF form: GPT writes a clean mission and replaces the form with 1 to 4 short questions. Everything is editable before publishing.
- Inbox per mission: AI fit summary, answers, the volunteer's track record and LinkedIn, contact details, accept or decline, messages.
- Both sides get an email for new applications, decisions, completed missions and messages.

## Stack

- Next.js 16 (App Router, Cache Components), React 19, TypeScript strict, Tailwind CSS 4, next-intl (FR/EN)
- AI SDK 7 with OpenAI (`gpt-6.1-sol`, Responses API with the built-in web search tool)
- Supabase: Postgres with row level security, email magic-link auth
- Brevo for transactional email (sign-in links and notifications)
- Vercel hosting and Web Analytics
- Data: MANA open API (dev relay of API Engagement), API Engagement adapter (official, needs a key), Géoplateforme geocoding, API Recherche d'Entreprises

## Architecture

```
src/
  app/                      routes: chat (/[locale]), /asso, /me, /api/chat, /auth/callback
  features/
    matching/               ToolLoopAgent, instructions, model selection
    missions/               normalized Mission model, search pipeline, ranking, country registry
      providers/            one adapter per source (MANA, API Engagement) + FR taxonomy
    geo/                    geocoder interface + Géoplateforme (France)
    organizations/          register verification, AI mission drafting, association UI
    applications/           AI pre-fill and fit summary, actions, inboxes, draft card
    chat/                   chat UI, tickets, saved missions
    auth/                   email-link sign-in (sent through Brevo, Supabase sender as fallback)
    notifications/          email templates and sending for applications, decisions, completions, messages
    volunteers/             profile, learned interests, badges, applicant view for associations
    space/                  "My space" layout, stats, saved missions
    ui/                     shared header, skeletons, styles
  lib/                      http with retries, errors, rate limiting, logger, Brevo client, Supabase clients
supabase/migrations/        schema and row level security
```

**Adding a country**: write a `MissionProvider` adapter (and a `Geocoder` if needed), register it in `src/features/missions/countries.ts`, add its guidance in `src/features/matching/instructions.ts`. The agent, ranking and UI stay the same. Web search already works in any country.

## Getting started

Prerequisites: Node.js 22+, an OpenAI API key, a Supabase project.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Apply the migrations in `supabase/migrations/` to your Supabase project (SQL editor or `supabase db push`), and add `http://localhost:3000/**` to Authentication > URL Configuration > Redirect URLs.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | yes | Chat agent, web search, mission drafting, application writing |
| `OPENAI_MODEL` | no | Override the model (default `gpt-6.1-sol`) |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Public key, used with row level security |
| `SUPABASE_SECRET_KEY` | yes | Server only: creates register-verified organizations and stores AI fit summaries |
| `API_ENGAGEMENT_API_KEY` | no | Official French source. Without it, Aido uses the MANA relay (development only) |
| `ALLOW_DEMO_ORGANIZATIONS` | no | `true` lets the test numbers `W000000000` / `000000000` create unverified demo associations outside development |
| `NEXT_PUBLIC_SITE_URL` | no | Public origin for email links when it differs from the request host |
| `BREVO_API_KEY` | no | Sends sign-in and notification emails. Without it, notifications are only logged and sign-in falls back to Supabase's sender |
| `BREVO_SENDER_EMAIL` | with Brevo | Sender address, must be verified in Brevo (Senders) |
| `BREVO_SENDER_NAME` | no | Sender name (default `Aido`) |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run test:rls` | 29 row level security checks against the real database with throwaway users (cleaned up after) |
| `npm run test:in-app-search` | Checks a mission posted on Aido ranks first in the search |
| `npm run dev:sign-in-link -- <email> <path>` | One-time sign-in link for a local test account, no inbox needed |
| `npm run smoke:chat -- "message" "follow-up"` | Plays a conversation against the local chat API |

## Known limits

- Without Brevo keys, sign-in emails fall back to Supabase's built-in sender, which only delivers to the project's team members. Set the `BREVO_*` variables before real users sign up.
- Register verification proves an association exists and is active, not that the person signing up represents it.
- MANA is an unofficial relay; production should use API Engagement (free key on request), which also requires reporting impressions.
- Rate limiting is per server instance; add a Vercel Firewall rule in production.
