# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Volunteers (primary).** People in France who want to give some of their time but do not know where, or give up in front of long listings, vague commitments and clunky association websites. Priority audience: busy working people with little time, who want short, flexible or remote missions and to use their professional skills. They arrive on a phone or a laptop, often in a spare moment, and describe their situation in a sentence or two.
- **Associations (secondary).** Small nonprofits with little time and no web team, who today publish missions on several platforms and receive applications through PDF forms sent by email.
- Later audiences, not served yet: companies and CSR teams, people in need of help.

## Product Purpose

Aido matches a volunteer with a mission that fits their place, time, skills and causes, then writes their application for them. Associations publish a mission in about two minutes from a plain description or their old PDF form, and receive applications that are ready to read. Success: a volunteer goes from "I'd like to help" to a sent application in one short conversation, without visiting an external site or filling a PDF.

## Positioning

A conversation instead of a search engine: the volunteer talks, Aido understands, searches every source in parallel (missions posted on Aido, JeVeuxAider.gouv.fr and Service Civique, the open web) and answers with a few missions explained in one sentence each. On Aido-posted missions, the AI also writes the application; the volunteer only checks and sends it.

## Operating Context

- Volunteer flow: describe yourself in the chat, refine via removable criteria tags, read 3 to 5 mission cards (reason, commitment gauge, dates), save some, apply on Aido or on the source site.
- Applying on Aido: Aido asks only the missing answers, shows a ready-to-send application card, the volunteer sends it with one click; sign-in is an email link at that moment. Replies are followed in "My applications".
- Association flow: email sign-in, RNA or SIREN checked against the official French register, mission drafted by AI from text or PDF and edited before publishing, applicant inbox with an AI fit summary, accept or decline, messages.
- Used in French and English. Built for an OpenAI DevDay community hackathon demo in Paris (Impact track).

## Capabilities and Constraints

- Next.js 16 web app, Supabase (Postgres, row level security, email magic links), OpenAI models via the AI SDK including web search.
- Mission data: Aido missions, MANA relay of API Engagement (JeVeuxAider, Service Civique) in development, official API Engagement adapter ready for a key.
- Country-agnostic by design: one adapter per country's data sources; France is the only country live.
- The AI never sends an application or claims something was sent: the volunteer always clicks.
- Register verification proves an association exists and is active, not that the person represents it.
- Sign-in emails currently reach only the Supabase project's team members (no transactional email provider yet).

## Brand Commitments

- Name: Aido (lowercase wordmark "aido").
- Voice: warm and human, plain words, short sentences, never jargon or hype. Speaks to people of all backgrounds who want to help.
- No em dashes in any copy.

## Evidence on Hand

- Real missions from JeVeuxAider.gouv.fr and Service Civique through live APIs; real web results.
- No testimonials, user numbers, partner associations or impact statistics exist yet: none may be invented.

## Product Principles

1. Fewer, better matches: three to five missions with a reason beat a list of hundreds.
2. Respect people's time: ask only what is missing, never make anyone fill a form the AI can fill.
3. Honest about commitment: always show how much a mission asks before anyone applies.
4. The person stays in control: the AI drafts, the human decides and sends.
5. Works anywhere: nothing in the core may assume France.

## Accessibility & Inclusion

- Must work for busy people on a phone in a spare moment: fast to scan, one-handed, short paths.
- Readable for all ages: body text at least 17px, WCAG AA contrast, visible keyboard focus, reduced motion respected.
- Bilingual French and English; French copy is often 20 to 30% longer than English.
