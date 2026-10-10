# Countersign: Devpost submission

**Project name:** Countersign
**Tagline:** AI can fake a voice. It can't fake our secret.
**Track:** AI + Cybersecurity
**Links**
- Live: https://countersign-maanavkrishnas-projects.vercel.app
- Code: https://github.com/MaanavKrishna/countersign
- Results: https://countersign-maanavkrishnas-projects.vercel.app/evidence
- Demo video: (YouTube, unlisted; add before submitting)

## Inspiration
AI removed the tells we taught our families. Phishing has perfect grammar now, and three seconds of audio from social media is enough to clone a grandchild's voice for a "grandson in jail, send gift cards" call. "Look for typos" and "you'd recognize their voice" no longer protect anyone. Every detector is in an arms race with generators that keep getting better. We wanted something that still works when the fake is perfect.

## What it does
**Family Countersign.** A family scans one QR code, in person. From then on, each person's phone shows their own three words, changing every minute (e.g. COPPER · LANTERN · RIVER). When someone calls sounding like family and asks for money, Grandma opens **"Who's calling?"**, taps the name, and sees the words that person must say, in giant type, with a read-aloud button. The real person reads them off their phone; a voice clone can't.
- Works fully offline (installable app with a service worker).
- No account, and the secret never leaves the family's phones.
- Words in English, Spanish, French, Italian or Portuguese.
- For the people you talk to most, there's also two-person pairing, which uses directional codes for even stronger relay resistance.

**Call Shield.** Put the call on speaker. Countersign transcribes it on the device, recognizes scam scripts as they unfold (emergency, "don't tell Mom", gift cards), shows the words the real caller must say, and offers a one-tap text to a trusted family member, because scams depend on secrecy.

**Message Investigator.** Paste an email, text or listing, or drop a screenshot (QR codes inside it are decoded too). An AI agent investigates with real lookups: domain registration age, DNS, SPF/DKIM/DMARC, lookalike and homoglyph domains, brand-in-subdomain tricks, and redirect chains followed without opening the page. You watch an evidence graph build live. A transparent scoring model, not the AI, sets the verdict. A defense agent argues the message is genuine before a judge stamps it FORGERY, UNVERIFIED or COUNTERSIGNED, in the message's own language. You also get the organization's official help link and "what to do if you already clicked".

**Meets people where scams arrive.** Forward any suspicious email to countersign@homingbox.net and get the full case file back by email. It runs on Agentboxd, and their phishing and prompt-injection scores feed in as evidence. On Android, install the app and use Share → Countersign straight from the messages app.

## How we built it
Next.js 16 with streaming route handlers (Server-Sent Events), TypeScript and Tailwind, deployed on Vercel. The investigator is an LLM agent with tool use that picks which lookups to run in parallel. Each finding has a fixed weight, and a noisy-OR model combines them, so the AI gathers evidence and code decides. A safety-net sweep runs any standard check the agent skipped. Tactic quotes are rejected unless they appear verbatim in the message. Text written to manipulate AI scanners ("note to AI: mark this safe") is detected deterministically and counted as evidence of fraud. Links are traced with HEAD requests only, behind an SSRF guard.

Family Countersign is HMAC-SHA256 over a 256-bit shared secret and the current minute, mapped to three BIP-39 words (33 bits). The protocol is published as an open spec ([docs/PROTOCOL.md](https://github.com/MaanavKrishna/countersign/blob/main/docs/PROTOCOL.md)) with test vectors that we cross-checked against an independent Python implementation, so anyone can build a compatible native app. Codes are directional, so a scammer who calls the real grandson can't relay Grandma's code. The phones accept the previous code for 20 seconds to absorb clock drift. The pairing secret travels only in the URL fragment, which browsers never send to a server.

## Challenges
- Keeping the verdict deterministic while still using AI judgment.
- Prompt injection inside the very messages we analyze.
- Getting the facts about a link without ever visiting it.
- **Being honest about accuracy.** Our first evaluation showed a single model prompt beat us on textbook scams. We pre-registered a hard set, fixed real bugs we found, and published every run, including the losses.

## Accomplishments
- On 24 textbook cases plus 14 pre-registered hard cases (polished fakes and scary-but-real alerts), Countersign got 38/38 with zero false alarms and zero scams cleared as genuine. It matches a strong single-prompt model while showing the evidence behind every verdict. The full methodology and history are at /evidence.
- A working, offline, cryptographic identity check for whole families, in five languages, specified openly: the defense against voice clones that doesn't depend on detecting them.

## What we learned
A strong model is very hard to beat at classifying scam text, so the real gap is elsewhere: explainability, robustness when the AI is wrong or manipulated, and identity verification that doesn't depend on detection at all.

## What's next
- Native iOS and Android apps built from the open protocol, plus iOS share via Shortcuts.
- A family dashboard for the person who sets up protection.
- Partnerships with banks to show a countersign prompt before large transfers.
