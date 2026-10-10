# Countersign protocol

A countersign is a speakable, rolling passphrase that two or more devices derive independently from a shared secret. It proves that the person on a call is someone you paired with in person, which a cloned voice or face cannot fake. No server is involved.

This document is complete enough to build a compatible app in any language. The test vectors below are checked by `src/lib/__tests__/vectors.test.ts` and were cross-checked with an independent Python implementation.

## Primitives

- **Secret:** 32 bytes from a cryptographically secure RNG, encoded as base64url without padding (43 characters).
- **Step:** `floor(unix_seconds / 60)`.
- **MAC:** `HMAC-SHA256(key = secret bytes, message = UTF-8 string)`.
- **Words:** take the first 33 bits of the MAC, big-endian, as three 11-bit indexes into a 2048-word [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039/bip-0039-wordlists.md) list:

  ```
  n  = (first 5 MAC bytes as big-endian integer) >> 7      # 33 bits
  w0 = list[(n >> 22) & 0x7FF]; w1 = list[(n >> 11) & 0x7FF]; w2 = list[n & 0x7FF]
  ```

  That's 33 bits per code, about 1 in 8.6 billion to guess, and a code is valid for one minute.

## v1: two-person pairing (directional)

- The creator holds role `a`; the partner who scans holds role `b`.
- The code `from → to` at a given step is `words(MAC("countersign/v1|" + from + ">" + to + "|" + step))`.
- Each device shows:
  - *"Say this when you call them"* = `code(me → them)`
  - *"They should say"* = `code(them → me)`
- Pairing link: `https://<site>/family/pair#v=1&s=<secret>&a=<creator name>&b=<partner name>`

## v2: Family Circle

- One secret is shared by the whole family; each member chooses a name.
- `normalize(name)` = Unicode NFC normalization, then trim, then lowercase using the default Unicode case mapping (JavaScript `toLowerCase()`, not locale-specific), then collapse each run of Unicode whitespace to a single U+0020 space. Names never contain commas (they're the member separator in join links), and they're capped at 60 characters after cleaning.
- A member's code is `words(MAC("countersign/v2|member|" + normalize(name) + "|" + step))`, using the circle's word list.
- Word lists: `en` (English, default), `es`, `fr`, `it`, `pt`. They are the official BIP-39 lists, so indexes are the same in every language and only the displayed words differ.
- Join link: `https://<site>/family/join#v=2&s=<secret>&c=<circle name>&m=<comma-separated members>&l=<lang>`
- **Starting fresh (re-keying).** When a phone is lost or someone leaves the circle, generate a new secret. The join link then carries an optional `&r=<tag>`, where `tag` = the first 8 bytes, as lowercase hex, of `SHA-256("countersign/v2|tag|" + old secret)`. A joining phone that holds a circle whose secret has that tag may offer to replace it. The tag reveals nothing about either secret. Removing a member without re-keying does **not** revoke them: they still hold the secret. Anyone who held the old secret (including a removed member) can compute its tag, so an implementation **must not** replace a circle automatically: ask the person, default to keeping the old circle, and only replace it when the code is being shown in person.

## Rules every implementation must follow

1. **The secret travels only in the URL fragment** (`#…`), which browsers never send to servers. Remove it from the address bar after pairing.
2. **Pair in person**, by QR code. A link sent over a channel an attacker can read gives them the secret.
3. **Clock-skew grace:** during the first 20 seconds of a step, also accept the previous step's code; during the last 20 seconds, also accept the next step's.
4. **Never speak your own code to someone who called you.** Codes are only spoken by the person who placed the call. This blocks relay attacks, where a scammer calls the real family member at the same time.
5. Keep the secret in local storage on the device only. Never sync it to a server.

## Test vectors

Secret: bytes `0x00, 0x01, …, 0x1f` → base64url `AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8`

| Message | Words |
|---|---|
| `countersign/v1\|a>b\|1000` | bomb icon sentence |
| `countersign/v1\|b>a\|1000` | favorite mosquito ordinary |
| `countersign/v1\|a>b\|1001` | ivory any plunge |
| `countersign/v2\|member\|ethan\|1000` (en) | bulb peasant position |
| same, name typed as `" ethan "` | bulb peasant position |
| `countersign/v2\|member\|ethan\|1000` (es) | besar ola paella |

## Threat model

See the README's [Family Countersign threat model](../README.md#threat-model).
