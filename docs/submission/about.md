## Inspiration

A grandmother picks up the phone and hears her grandson crying. *"Grandma, it's me. I'm in jail. Please don't tell Mom."* The voice is perfect, because it was cloned from a few seconds of a social-media video.

Every piece of scam advice we grew up with assumed the fake would slip: a typo, a strange accent, a voice that sounds a little off. Generative AI removed those tells. Phishing emails now have perfect grammar, and a voice clone sounds exactly like the person. Detectors are stuck in an arms race with generators that improve every month.

So we asked a different question. **Instead of detecting the fake, what if we verify the real person?** Banks solved this decades ago with security tokens that show a new code every 30 seconds. We wanted that idea, spoken out loud and simple enough for a grandparent. That became **Countersign**: *AI can fake a voice. It can't fake our secret.*

## What it does

- **Family Countersign.** A family scans one QR code, once, in person. From then on each person's phone shows their own three words, changing every minute (for example, `COPPER · LANTERN · RIVER`). When a call asks for money, Grandma taps **Who's calling?**, taps the name, and asks for the countersign. The real grandson reads the words off his phone. A clone can't. It needs no account and no server, and it works with no signal.
- **Call Shield.** With the call on speaker, it spots the scam script as it unfolds (an emergency, "don't tell Mom", gift cards), tells you exactly what to ask, and offers a one-tap text to someone you trust, because scams depend on secrecy. It can keep the whole call on the phone.
- **Message Investigator.** Paste an email or drop in a screenshot. An AI agent runs real lookups: domain age, DNS, email authentication, lookalike domains, redirect chains and QR codes. Fixed rules, not the model, decide the verdict. You can also just forward the email to the inbox and get the case file back.
- **Built for the habit.** Practice scam calls, a weekly two-minute drill in your calendar, a printable card for the phone table, an optional Face ID lock on the words, and five languages.

## How we built it

**Stack.** Next.js 16 (App Router, streaming Server-Sent Events), TypeScript, Tailwind CSS, Web Crypto, Web Speech, WebAuthn and a service worker, deployed on Vercel. The code is split into modules whose boundaries are enforced by lint rules. For example, the family module can't import any AI or server code, so the most important feature can never depend on something that can fail.

**The family protocol.** Each circle shares a 256-bit secret $K$. A member's words for the current minute are

$$
\text{code}(K, n, t) = \text{BIP39}_3\!\left(\operatorname{HMAC\text{-}SHA256}\!\left(K,\ \texttt{"countersign/v2|member|"} \,\|\, n \,\|\, \texttt{"|"} \,\|\, \lfloor t/60 \rfloor\right)\right)
$$

where $n$ is the member's normalized name and $\text{BIP39}_3$ maps the first 33 bits to three words from a 2048-word list. One guess succeeds with probability

$$
P(\text{guess}) = 2^{-33} \approx \frac{1}{8.6 \times 10^{9}},
$$

and the code expires within a minute. Phones accept the neighbouring minute's code for 20 seconds to absorb clock drift. The secret travels only in the URL fragment, which browsers never send to servers. Every screen says to read your words only when *you* placed the call, and for the closest pairs there's a two-person mode with directional codes, so a scammer who calls the real grandson at the same time can't relay Grandma's expected words. The protocol is published with test vectors so anyone can build a compatible app.

**The verdict.** The AI gathers evidence; code decides. Each finding has a fixed weight, and a noisy-OR combines independent risk signals $w_i$, discounted by trust signals $t_j$:

$$
\text{risk} = \Bigl(1 - \prod_i (1 - w_i)\Bigr) \cdot \prod_j (1 - t_j)
$$

with bands $\text{risk} \ge 0.70$ for **FORGERY**, $\ge 0.35$ for **UNVERIFIED**, and below that **COUNTERSIGNED**. Trust signals are ignored whenever there's impersonation evidence, because an old domain can't vouch for a message pretending to be someone else. A defense agent argues the message is genuine and a judge explains the ruling, but neither can change the band. If the model is down, the deterministic checks still produce a verdict.

**Testing.** We wrote 179 unit tests (including the protocol's test vectors) and 22 browser tests. One of them runs two separate browser contexts as two phones and checks that the words one phone shows match what the other expects. CI runs on every push. The demo video was recorded by a script that drives the real app.

## Challenges we ran into

- **Being honest about accuracy.** Our first evaluation showed that a single AI prompt matched us on textbook scams. So we pre-registered test sets (committed before any system ran on them), published every run, and lost one: on an adversarial set we scored 10/12 against the prompt's 12/12, because we flagged genuine messages that *quoted* prompt-injection text. We fixed the cause and validated the fix on a fresh hold-out nobody had seen. There, Countersign got **17/18 and a single prompt 8/18**. With samples this small we show 95% Wilson intervals, so one case is never oversold:

$$
\frac{\hat{p} + \frac{z^2}{2n}}{1 + \frac{z^2}{n}} \;\pm\; \frac{z}{1 + \frac{z^2}{n}}\sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}, \qquad z = 1.96
$$

- **Prompt injection inside the evidence.** Scams now carry text aimed at AI screeners: fake "security scan: SAFE" reports, fake assistant transcripts, instructions in Spanish. We detect those deterministically and count them as evidence. The tricky part was not punishing a security newsletter that quotes the same text as an example.
- **QR codes in real screenshots.** While recording the demo, we found that the QR library missed anti-aliased codes in real screenshots, so the hidden link silently never reached the investigator. We now use the browser's native barcode detector first, then the library at several scales. A browser test pins the exact screenshot that failed.
- **Real life breaks protocols.** Phones get lost, people leave the family, and scammers say *"my phone died, I can't see the words."* We added re-keying ("start fresh"), an opt-in replacement rule so a removed member can't push a fake update, a practice scenario for the dead-phone trick, and an optional biometric lock.
- **Designing for grandparents.** Big type, one decision per screen, words read aloud, and the whole check reachable from a single home-screen shortcut.

## What we learned

- A strong AI model is very hard to beat at *reading* scam text. The real gap is what it can't see (QR codes, domain age, email authentication, redirects) and what happens when it's wrong, manipulated or down.
- Identity verification beats detection. Against a perfect voice clone, no detector wins, but a shared secret still does.
- Pre-registering tests keeps you honest. Losing a test we'd published taught us more than the ones we won.
- Adoption is the hardest problem in security. The cryptography took a day; making the habit stick (practice calls, drills, a card by the phone) took the rest.

## What's next

- Native iOS and Android apps built from the open protocol.
- A family dashboard for whoever sets up protection.
- Bank partnerships that prompt for the countersign before large transfers.
- Testing with real families, to measure whether the habit sticks.
