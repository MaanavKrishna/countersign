// Realistic case files for the demo. Domains are fictional lookalikes.

export type Sample = { id: string; label: string; text: string };

export const SAMPLES: Sample[] = [
  {
    id: "paypal",
    label: "PayPal “account limited” email",
    text: `From: PayPal Service <service@paypa1-secure.com>
Reply-To: help.desk.verify@gmail.com
Return-Path: <bounce@mailer-notify.ru>
To: you@example.com
Subject: Your account access has been limited
Authentication-Results: mx.google.com; spf=softfail smtp.mailfrom=paypa1-secure.com; dkim=none; dmarc=fail (p=NONE) header.from=paypa1-secure.com

Dear Customer,

We noticed unusual activity on your PayPal account. Your account will be permanently suspended within 24 hours unless you verify your identity and confirm your card details here:

https://bit.ly/3xK9pQ

Do not share this notice — it contains a secure reference for your case.

PayPal Security Team`,
  },
  {
    id: "usps",
    label: "USPS redelivery text",
    text: `USPS: Your package US9514901185421 is on hold due to an incomplete address. Confirm your details within 12 hours or it will be returned to sender. A $1.99 redelivery fee applies: https://usps.com-redelivery.top/us

Reply Y then reopen this message to activate the link.`,
  },
  {
    id: "himum",
    label: "“Hi Mum, new number” WhatsApp",
    text: `Hi Mum, it's me 🙈 I dropped my phone in the toilet, this is my new number. Can you do me a massive favour? I need to pay a bill today but my banking app is locked on the new phone. Can you send £1,450 to the account below and I'll pay you back tomorrow first thing. Please don't call, the mic on this phone is broken. Love you xx

Name: J. Okafor
Sort code: 04-00-75
Account: 51239984`,
  },
  {
    id: "github",
    label: "Genuine GitHub security alert",
    text: `From: GitHub <noreply@github.com>
To: you@example.com
Subject: [GitHub] A new SSH authentication public key was added to your account
Authentication-Results: mx.google.com; dkim=pass header.i=@github.com header.s=pf2023; spf=pass smtp.mailfrom=noreply@github.com; dmarc=pass (p=REJECT) header.from=github.com

The following SSH key was added to your account:

  laptop-2026
  SHA256:Z3x9tK0q8w1fJ6mV2bH4cN7rL5pY0dE3uA9sQ1gW8kI

If you believe this key was added in error, you can remove the key and disable access at the following location:

https://github.com/settings/keys

To see this and other security events for your account, visit https://github.com/settings/security-log

Thanks,
The GitHub Team`,
  },
];
