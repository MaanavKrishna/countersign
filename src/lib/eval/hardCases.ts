import type { EvalCase } from "./cases";

// Hard set, pre-registered (committed before any system was run on it).
// Scams: polished text with few or no pressure words; the giveaway is in the
// infrastructure. Legit: genuinely alarming messages from the real sender.

export type HardCase = Omit<EvalCase, "group"> & { group: "hard" };

export const HARD_CASES: HardCase[] = [
  // ── Polished scams ──────────────────────────────────────────────────────
  {
    id: "h-m365-storage",
    label: "scam",
    group: "hard",
    text: `From: Microsoft 365 <no-reply@microsoft-365-storage.com>
Subject: Your mailbox is 98% full

Hello,

Your Microsoft 365 mailbox has reached 98% of its storage limit. New messages may not be delivered once the limit is reached.

You can review your storage and enable additional space here:
https://microsoft-365-storage.com/mailbox/upgrade

Thank you,
Microsoft 365 Team`,
  },
  {
    id: "h-docusign",
    label: "scam",
    group: "hard",
    text: `From: DocuSign <dse@docusign-envelopes.net>
Subject: Maya Patel sent you a document to review and sign

Maya Patel sent you a document to review and sign.

Q3 Vendor Agreement.pdf

REVIEW DOCUMENT: https://docusign-envelopes.net/review/7f3a91c2

Do not share this email. This message was sent to you by Maya Patel who is using the DocuSign Electronic Signature Service.`,
  },
  {
    id: "h-netflix-billing",
    label: "scam",
    group: "hard",
    text: `From: Netflix <info@netflix-billing-support.com>
Subject: Update your payment details

Hi,

We weren't able to process your most recent payment. To keep enjoying Netflix, please update your payment information.

Update payment: https://netflix-billing-support.com/account/payment

We're here to help if you need it.
The Netflix team`,
  },
  {
    id: "h-apple-homoglyph",
    label: "scam",
    group: "hard",
    text: `Your receipt from Apple

Order ID: MXK29LL/A
Apple Music Family (Monthly) $16.99

If you didn't make this purchase, you can manage your subscriptions at https://xn--pple-43d.com/account/subscriptions`,
  },
  {
    id: "h-amazon-subdomain",
    label: "scam",
    group: "hard",
    text: "Amazon: We couldn't deliver your order #112-4839201-5528311. Please review your delivery address so we can reschedule: https://amazon.com.order-review.info/112-4839201",
  },
  {
    id: "h-payroll-bec",
    label: "scam",
    group: "hard",
    text: `From: Payroll Team <payroll@northwind-hr-portal.com>
Reply-To: northwind.payroll.team@gmail.com
Subject: Direct deposit confirmation for the new payroll system

Hi,

As part of our move to the new payroll provider this month, please reply with the bank account and routing number you'd like your salary deposited to, so we can confirm your record before the next pay run.

Thanks,
Payroll Team`,
  },
  {
    id: "h-linkedin-views",
    label: "scam",
    group: "hard",
    text: `From: LinkedIn <messages-noreply@linkedin-notifications.co>
Subject: You appeared in 9 searches this week

You appeared in 9 searches this week. See who's looking at your profile:
https://linkedin.com.profile-views.co/me/searches`,
  },
  {
    id: "h-drive-share",
    label: "scam",
    group: "hard",
    text: `From: Google Drive <drive-shares-noreply@google-docs-share.net>
Subject: "2026 Bonus Structure.xlsx" was shared with you

Daniel Ortiz has shared a spreadsheet with you.

2026 Bonus Structure.xlsx

Open: https://google-docs-share.net/spreadsheets/d/1xY9kQ`,
  },
  // ── Genuine but alarming ────────────────────────────────────────────────
  {
    id: "h-chase-fraud-real",
    label: "legit",
    group: "hard",
    text: `From: Chase <no.reply.alerts@chase.com>
Subject: Did you make this purchase?
Authentication-Results: mx.google.com; dkim=pass header.i=@chase.com; spf=pass smtp.mailfrom=no.reply.alerts@chase.com; dmarc=pass (p=REJECT) header.from=chase.com

We spotted an unusual transaction on your card ending in 4417: $412.80 at BEST BUY on Oct 9.

If this was you, no action is needed. If not, open the Chase app or call the number on the back of your card. We'll never ask for your PIN, password or one-time code.`,
  },
  {
    id: "h-google-critical-real",
    label: "legit",
    group: "hard",
    text: `From: Google <no-reply@accounts.google.com>
Subject: Critical security alert
Authentication-Results: mx.google.com; dkim=pass header.i=@accounts.google.com; spf=pass smtp.mailfrom=no-reply@accounts.google.com; dmarc=pass (p=REJECT) header.from=accounts.google.com

Someone just used your password to try to sign in to your account. Google blocked them, but you should check what happened.

Check activity: https://myaccount.google.com/notifications`,
  },
  {
    id: "h-2fa-code-real",
    label: "legit",
    group: "hard",
    text: "Your Microsoft account verification code is 482913. Don't share this code with anyone. If you didn't request it, you can ignore this message.",
  },
  {
    id: "h-paypal-receipt-real",
    label: "legit",
    group: "hard",
    text: `From: PayPal <service@paypal.com>
Subject: You sent a payment of $25.00 USD to Sam Lee
Authentication-Results: mx.google.com; dkim=pass header.i=@paypal.com; spf=pass smtp.mailfrom=service@paypal.com; dmarc=pass (p=REJECT) header.from=paypal.com

You sent $25.00 USD to Sam Lee.
Note: dinner split

View the transaction details in your account: https://www.paypal.com/myaccount/activity`,
  },
  {
    id: "h-usps-informed-real",
    label: "legit",
    group: "hard",
    text: `From: USPS Informed Delivery <USPSInformeddelivery@email.informeddelivery.usps.com>
Subject: Your Daily Digest for Fri, 10/9
Authentication-Results: mx.google.com; dkim=pass header.i=@email.informeddelivery.usps.com; spf=pass; dmarc=pass (p=REJECT) header.from=email.informeddelivery.usps.com

You have 3 mailpieces and 1 package arriving soon.

View your dashboard: https://informeddelivery.usps.com/box/pages/secure/DashboardAction_input.action`,
  },
  {
    id: "h-it-password-real",
    label: "legit",
    group: "hard",
    text: "Reminder from IT: your network password expires in 5 days. Change it the usual way from the company portal, or ask the help desk at extension 4400 if you get stuck.",
  },
];
