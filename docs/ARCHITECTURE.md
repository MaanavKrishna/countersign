# Architecture

Countersign is three products that share one small core:

| Product | Where it runs | Needs the network? | Needs the AI? |
|---|---|---|---|
| **Family Countersign**: rolling family words, Who's calling?, practice calls, drills | The phone, in the browser | No (after the first visit) | No |
| **Call Shield**: live call listening, scam-script detection, challenge questions | The phone, plus an optional server check | Optional | Optional (on-device rules fall back) |
| **Message Investigator**: evidence-based verdicts for emails, texts and screenshots | Server | Yes | Optional (deterministic checks fall back) |

The rule behind the design: **the most important protection must not depend on anything that can fail.** The family secret never leaves the phone, so a server outage, an AI outage or a leaked database cannot affect it.

## Modules

```
src/lib/
  core/          Pure, shared, runs anywhere: scoring (signal registry + noisy-OR), core types,
                 domain parsing, brand list, tactic labels. Imports nothing else.
  family/        Family Countersign. Protocol (HMAC-SHA256 rolling words), circles, re-keying,
                 local store, word lock (WebAuthn), languages and UI strings, practice-call
                 state machine, weekly drill calendar. Offline; no AI or server code.
  shield/        Call Shield. On-device scam-script rules, the AI assessment (server), call
                 stages, Memory Vault, trusted-contact alert, caller/person matching.
  investigator/  Message Investigator. Indicator extraction, injection detection, combination
                 and judgment signals, lookup tools (RDAP, DNS, email auth, lookalike, redirect
                 trace, sandbox), the agents (investigator, tactics, debate), the pipeline that
                 orchestrates them and streams events, report builders, QR decoding, samples.
  channels/      Ways messages arrive: the forward-to-check email inbox (Agentboxd), its
                 de-duplication, reply policy and forwarded-mail parsing.
  ai/            The model client. Server-only.
  server/        Server utilities (rate limits).
  telemetry/     URL scrubbing, crash reports. Never sees app data.
  eval/          Labelled sets, the single-prompt baseline, metrics, QR test pictures.
```

Tests live beside what they test, in each module's `__tests__/` folder. Browser tests are in `e2e/`.

## Boundaries (enforced)

`eslint.config.mjs` fails the build when a module imports something it shouldn't:

| Module | May not import | Why |
|---|---|---|
| `core` | anything else in `lib` | It's the shared base |
| `family` | `investigator`, `shield`, `ai`, `server`, `channels`, `telemetry`, `eval` | Must work offline on the phone with no AI and no server |
| `shield` | `investigator`, `channels`, `eval`, `family` | Call Shield stands alone; the UI composes it with family words |
| `investigator` | `family`, `shield`, `channels`, `eval` | Doesn't know how messages arrive or who the family is |
| `telemetry` | everything except `core` | Can't see app data, so it can't leak it |
| UI (`components`, pages) | `ai`, `server`, `channels`, the pipeline, agents, tools, report builders, `shield/ai` | Server code is reached only through `/api` routes |

On top of that, server modules (`ai/client`, the pipeline, the tool registry, the shield AI, the email channel) import `server-only`, so Next.js refuses to bundle them into the browser.

## Trust boundaries and data flow

```
 Phone (browser)                                   Server (Vercel)                 Outside
 ───────────────                                   ───────────────                 ───────
 family secret ── never leaves ──┐
 Who's calling? / words / lock   │
                                 │
 Call Shield ── transcript ──────┼──► /api/shield ──► model API
   └─ "on this phone": rules only (nothing sent)       └─ on failure: same rules
                                 │
 Check a message ── text, image ─┼──► /api/investigate ──► pipeline ──► RDAP, DNS, HEAD-only
   (QR decoded on the phone)     │        (SSE stream)        │            link tracing, urlscan
                                 │                            └──► model API (agents)
 Email forward ───────────────── ┼──► /api/inbox (signed webhook) ──► pipeline ──► reply email
 Analytics / crash reports ──────┴──► path only, no query or fragment, no error messages
```

- **The secret travels only in URL fragments** (`#…`), which browsers never send to servers, and is removed from the address bar on arrival. A screenshot containing a family QR code is refused on the phone, so neither the picture nor the link is uploaded.
- **Message content is untrusted data.** It's wrapped as such for every model call, and every tool is a read-only lookup. Text written to steer an AI is detected deterministically and counted as evidence.
- **Links are never opened.** Tracing uses HEAD requests behind an SSRF guard. Rendering, if enabled, happens remotely.

## How a verdict is made

1. **Indicators**: URLs, domains, sender, reply-to, headers, phones, money and payment terms, claimed brands.
2. **Deterministic signals**: AI-directed text, and provider scores. Quoting an attack as an example ("such as …") counts as weak evidence (0.15) rather than an attack (0.55).
3. **In parallel**: the tactics agent quotes manipulation tactics verbatim (unverifiable quotes are dropped) and gives one overall read; the investigator agent chooses lookups.
4. **Safety-net sweep**: any standard lookup the agent skipped runs anyway. Then, once the model's findings are in (so the order is deterministic), **link trust**: every link and the sender are on one brand's own domains. User-content hosts (S3, Google Sites and Docs, GitHub Pages) never count as the brand's own.
5. **Combination signals**:
   - The message claims a brand and links to a domain whose name contains that brand as a whole word but isn't the brand's (`amazon-returns-dropoff.com`).
   - A claimed identity plus a request for money, codes or access. This is suppressed only when the claim is corroborated: the brand authenticated the mail, or the brand's own links are the only way to respond, with no phone number and no reply address elsewhere.
6. **Score**: `risk = (1 − Π(1 − wᵢ)) × Π(1 − tⱼ)` over fixed weights in `core/scoring.ts`. When there's impersonation evidence, the trust signals that can't vouch for an impersonator (an old domain, links on the brand, the model's "genuine") are ignored. Bands: ≥ 0.70 FORGERY, ≥ 0.35 UNVERIFIED, else COUNTERSIGNED.
7. **Debate**: a defense agent argues it's genuine, a judge writes the explanation in the message's language. **Neither can change the band.**

If the model is unavailable, steps 1, 2, 4 and 6 and the first combination signal still run and produce a verdict, marked as degraded. The identity-plus-request signal needs the model's tactic findings, so it only runs with the model.

## Testing

- `npm test`: unit tests per module, including the protocol's published test vectors.
- `npm run e2e`: browser tests against a production build. Two separate browser contexts act as two phones. The suite also covers offline mode, layouts at 390px, the word lock (with a virtual authenticator), the practice call and Call Shield.
- `npm run eval`: accuracy against a single-prompt baseline on labelled sets, some pre-registered. See `/evidence`.
- CI (GitHub Actions) runs typegen, type-check, lint (including the boundaries), unit tests and browser tests on every push.
