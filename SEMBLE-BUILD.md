# SEMBLE — THE BUILD PROMPT
### The order that turns the spec into the platform · Draft 1 · August 18, 2026

This document is written to be handed to a builder — human or agent — and produce
the real platform. It assumes [SEMBLE-SPEC.md](SEMBLE-SPEC.md) has been read in full.
The spec says what Semble is. This says what to build, in what order, and what is
already true.

---

## 0 · WHAT ALREADY EXISTS (do not rebuild)

- **semble.cc** — the site, the story, the words. Static, open source, deployed.
- **Semble CCs** — real WebRTC voice rooms (PeerJS mesh, host-authoritative roster,
  roles, raise-hand, reactions). No backend. This is the one production feature.
- **The app preview** — the full UX of Trax · Init · Semble · Next Sesh with seeded
  people and Sesh states. It is the design contract for the real app.
- **The Semble Mainboard** — the WebGL world beneath every page. 23 components, one
  per building block. Its SCC/MCC meters are the visual language for compute state.
- **The lexicon** — locked in spec §0. Sesh · Trax · Steps · Init · !MOTUS · The
  Crossing · CC Models · SCU · SCC · MCC.

## 1 · THE FIRST REAL LOOP (build this before anything else)

One loop, end to end, no accounts required to join:

1. A person **Inits** a Sesh: place, time, threshold, Model. One form, one link.
2. The link opens the Sesh page: who is on it, seats left, the threshold.
3. People **commit** (name + optional contact — no password, no signup wall).
4. Threshold fills → the Sesh is **certain** → everyone is told once → "You're on it."
5. The room gets its **CC** (already works) and its record: a Sesh that happened.

Persistence: one small store (SQLite/Postgres via a single serverless API, or
Supabase). Every write is idempotent; the Sesh link is the identity. The person who
Inits holds an edit key (signed URL), not an account.

That is v1. Everything else — profiles, Trax lines, !MOTUS allocation — hangs off a
loop that already ran.

## 2 · SEQUENCE AFTER THE LOOP

- **F-order:** F2 Init (real) → F1 One Active Semble → F5 threshold/commit → CC
  binding → F9 Steps + signing → Trax rendering from real records → !MOTUS pool +
  allocation → the rest of F1–F14 per spec §7.
- Each feature ships behind the same law: works for a cold stranger on a phone,
  no explanation needed, his copy leads.

## 3 · THE COMPUTE RAIL (SCU · SCC · MCC)

The words are locked (spec §0). The mechanics, as currently designed:

- **SCU — Semble Compute Unit.** One supervised agent-minute: agent work run while a
  person is present. The atomic, meterable thing.
- **SCC — Semble Compute Core.** Linked SCUs; the working tier. A room's pooled
  units run as cores. The SCC meter (already on the mainboard) is the live gauge.
- **MCC — Motus Compute Core.** The highest tier. **Never purchasable.** An MCC
  ignites when a threshold is crossed — a Sesh fills, a funding pool completes, a
  Step chain lands. Spent on the magic moments: the big model, the long run, the
  launch burst. Gold, rare, earned.

**Two inlets, one pool:**
- **Fund it** — back a build's compute. (Pledges first; live payment rails are a
  founder decision, currently parked.)
- **Contribute it** — run a verified worker and earn SCUs for the pool.
- (In rooms, !MOTUS converts to SCUs — credit for witnessed work becomes capacity.)

**MOTUS LIVE — crowdfunded compute, on air.** The stream shows a builder building.
The mainboard is the broadcast graphic: the SCC bar is the pool filling in real
time, the orb watering a component is compute being spent on that part of the
stack, and when the pool crosses its threshold the gold MCC ignites **live on
stream**. Funding state and the art are the same surface. Watch a build, fuel it,
see the gold moment land.

## 4 · OPEN DECISIONS (founder's, not the builder's)

- SCU pricing and whether pledges convert automatically when rails open.
- Whether contributed compute earns SCU, !MOTUS, or both.
- MCC persistence: does an unspent ignition hold, or fade?
- Stream home: MOTUSLIVE native vs. simulcast.
- Custody stance for any funding flow (current posture: non-custodial, earned-first,
  no token-sale framing).

## 5 · STANDING LAWS FOR EVERY BUILDER

Mobile first, verified at 375px. No secrets in this repo — fail-closed scrub before
push. The founder's words lead on all copy; keep drafts brief and replaceable. No
sharp corners. Glow, never highlight. Cold computes, warm ignites. Ship nothing you
have not walked as a cold stranger.

---

*Semble — Convene With Confidence. The build is public; the standard is not
negotiable.*
