# Countersign: Devpost draft

**Project name:** Countersign
**Tagline:** AI can fake a voice. It can't fake our secret.
**Track:** AI + Cybersecurity
**Links:**
- Live: https://countersign-maanavkrishnas-projects.vercel.app
- Code: https://github.com/MaanavKrishna/countersign
- Demo video: (added before submission)

## Inspiration
AI removed the tells we taught our families to look for. Phishing now has perfect grammar, and a few seconds of social-media audio is enough to clone a grandchild's voice for a "grandson in jail, send gift cards" call. "Look for typos" and "you'd recognize their voice" no longer protect anyone.

## What it does
- **Message Investigator.** Paste a suspicious email, text or listing, or drop a screenshot. An AI agent investigates it with real lookups: domain registration age, DNS, email authentication (SPF/DKIM/DMARC), lookalike and homoglyph domains, and redirect chains, which it follows without ever opening the page. You watch the evidence graph build live. A transparent scoring model, not the AI, sets the verdict. A defense agent then argues the message is genuine before a judge stamps it **FORGERY**, **UNVERIFIED** or **COUNTERSIGNED**. You get the official way to verify with the real organization, plus "what to do if you already clicked".
- **Call Shield.** Put a call on speaker. Countersign transcribes it on your device and recognizes scam scripts as they unfold: emergency, secrecy, gift cards. It then hands you a challenge only the real person can answer.
- **Family Countersign** *(in progress)*. Two phones paired once by QR show the same three words, changing every minute. A cloned voice can't produce them.

## How we built it
Next.js 16 with streaming route handlers (Server-Sent Events), TypeScript and Tailwind. An LLM agent with tool use picks which lookups to run in parallel. Every finding carries a fixed weight, and a noisy-OR model computes the risk, so the AI gathers the evidence and code decides the verdict. A safety-net sweep runs any check the agent skipped. Tactic quotes are rejected unless they appear verbatim in the message. Links are traced with HEAD requests only, with an SSRF guard against private addresses, and are always shown defanged.

## Challenges
Keeping the verdict deterministic while still using AI judgment. Resisting prompt injection inside the very messages we analyze. Never fetching a scam page while still learning where its links go.

## Accomplishments
On 8 labelled real-world cases: 7/8 exact verdicts, and 0 scams cleared as genuine.

## What's next
Forward-to-check by email, Android share-sheet integration, QR-code ("quishing") screenshots, verdicts in the user's own language.
