// Brands that scammers most often impersonate. Used for lookalike-domain
// detection and for the "verify through a channel you trust" card.
// `domains` are the brand's own registrable domains; `token` is the word a
// lookalike tends to contain. `help` is the brand's official help/contact
// entry point — the user is always told to navigate there themselves.

export type Brand = {
  name: string;
  token: string;
  domains: string[];
  help: string;
  aliases?: string[];
};

export const BRANDS: Brand[] = [
  { name: "PayPal", token: "paypal", domains: ["paypal.com", "paypal.me"], help: "https://www.paypal.com/us/smarthelp/contact-us" },
  { name: "Amazon", token: "amazon", domains: ["amazon.com", "amazon.co.uk", "amazon.ca", "amazon.in", "amazon.de", "amazonaws.com"], help: "https://www.amazon.com/gp/help/customer/contact-us", aliases: ["prime"] },
  { name: "Apple", token: "apple", domains: ["apple.com", "icloud.com", "me.com"], help: "https://support.apple.com/contact", aliases: ["icloud", "itunes", "apple id"] },
  { name: "Microsoft", token: "microsoft", domains: ["microsoft.com", "outlook.com", "live.com", "office.com", "microsoftonline.com", "office365.com"], help: "https://support.microsoft.com/contactus", aliases: ["outlook", "office 365", "office365", "windows defender"] },
  { name: "Google", token: "google", domains: ["google.com", "accounts.google.com", "youtube.com"], help: "https://support.google.com", aliases: ["gmail"] },
  { name: "Netflix", token: "netflix", domains: ["netflix.com"], help: "https://help.netflix.com/contactus" },
  { name: "USPS", token: "usps", domains: ["usps.com", "usps.gov", "uspis.gov"], help: "https://www.usps.com/help/", aliases: ["postal service", "us postal"] },
  { name: "UPS", token: "ups", domains: ["ups.com"], help: "https://www.ups.com" },
  { name: "FedEx", token: "fedex", domains: ["fedex.com"], help: "https://www.fedex.com" },
  { name: "DHL", token: "dhl", domains: ["dhl.com", "dhl.de"], help: "https://www.dhl.com" },
  { name: "IRS", token: "irs", domains: ["irs.gov"], help: "https://www.irs.gov/help/tax-scams", aliases: ["internal revenue service"] },
  { name: "Social Security Administration", token: "ssa", domains: ["ssa.gov"], help: "https://www.ssa.gov/scam/", aliases: ["social security"] },
  { name: "Chase", token: "chase", domains: ["chase.com", "jpmorgan.com", "jpmorganchase.com"], help: "https://www.chase.com/digital/customer-service" },
  { name: "Bank of America", token: "bankofamerica", domains: ["bankofamerica.com", "bofa.com"], help: "https://www.bankofamerica.com/customer-service/contact-us/", aliases: ["bofa"] },
  { name: "Wells Fargo", token: "wellsfargo", domains: ["wellsfargo.com", "wf.com"], help: "https://www.wellsfargo.com/help/" },
  { name: "Citi", token: "citi", domains: ["citi.com", "citibank.com"], help: "https://www.citi.com" },
  { name: "Capital One", token: "capitalone", domains: ["capitalone.com"], help: "https://www.capitalone.com/help-center/" },
  { name: "American Express", token: "americanexpress", domains: ["americanexpress.com", "aexp.com"], help: "https://www.americanexpress.com/en-us/customer-service/", aliases: ["amex"] },
  { name: "Venmo", token: "venmo", domains: ["venmo.com"], help: "https://help.venmo.com" },
  { name: "Zelle", token: "zelle", domains: ["zellepay.com"], help: "https://www.zellepay.com/support" },
  { name: "Coinbase", token: "coinbase", domains: ["coinbase.com"], help: "https://help.coinbase.com" },
  { name: "Binance", token: "binance", domains: ["binance.com"], help: "https://www.binance.com/en/support" },
  { name: "Meta / Facebook", token: "facebook", domains: ["facebook.com", "facebookmail.com", "meta.com", "fb.com"], help: "https://www.facebook.com/help", aliases: ["meta"] },
  { name: "Instagram", token: "instagram", domains: ["instagram.com", "mail.instagram.com"], help: "https://help.instagram.com" },
  { name: "WhatsApp", token: "whatsapp", domains: ["whatsapp.com", "whatsapp.net"], help: "https://faq.whatsapp.com" },
  { name: "LinkedIn", token: "linkedin", domains: ["linkedin.com"], help: "https://www.linkedin.com/help/linkedin" },
  { name: "DocuSign", token: "docusign", domains: ["docusign.com", "docusign.net"], help: "https://support.docusign.com" },
  { name: "Dropbox", token: "dropbox", domains: ["dropbox.com", "dropboxmail.com"], help: "https://help.dropbox.com" },
  { name: "GitHub", token: "github", domains: ["github.com", "githubusercontent.com"], help: "https://support.github.com" },
  { name: "eBay", token: "ebay", domains: ["ebay.com"], help: "https://www.ebay.com/help/home" },
  { name: "Walmart", token: "walmart", domains: ["walmart.com"], help: "https://www.walmart.com/help" },
  { name: "Best Buy / Geek Squad", token: "geeksquad", domains: ["bestbuy.com", "geeksquad.com"], help: "https://www.bestbuy.com/site/help-topics/contact-us/pcmcat204400050067.c", aliases: ["geek squad", "best buy"] },
  { name: "Norton", token: "norton", domains: ["norton.com", "nortonlifelock.com"], help: "https://support.norton.com" },
  { name: "McAfee", token: "mcafee", domains: ["mcafee.com"], help: "https://www.mcafee.com/support" },
  { name: "Spotify", token: "spotify", domains: ["spotify.com"], help: "https://support.spotify.com" },
  { name: "Steam", token: "steam", domains: ["steampowered.com", "steamcommunity.com"], help: "https://help.steampowered.com" },
  { name: "Costco", token: "costco", domains: ["costco.com"], help: "https://customerservice.costco.com" },
  { name: "Verizon", token: "verizon", domains: ["verizon.com", "verizonwireless.com"], help: "https://www.verizon.com/support/" },
  { name: "AT&T", token: "att", domains: ["att.com", "att.net"], help: "https://www.att.com/support/" },
  { name: "T-Mobile", token: "tmobile", domains: ["t-mobile.com"], help: "https://www.t-mobile.com/contact-us" },
  { name: "E-ZPass", token: "ezpass", domains: ["e-zpassny.com", "e-zpassiag.com", "ezpassnj.com", "ezdrivema.com"], help: "https://www.e-zpassiag.com", aliases: ["e-zpass", "toll"] },
];

export const ALL_BRAND_DOMAINS = new Set(BRANDS.flatMap((b) => b.domains));

export function brandForDomain(domain: string): Brand | null {
  const d = domain.toLowerCase();
  return (
    BRANDS.find((b) => b.domains.some((bd) => d === bd || d.endsWith(`.${bd}`))) ?? null
  );
}

export function brandByName(name: string): Brand | null {
  const n = name.toLowerCase();
  return (
    BRANDS.find(
      (b) =>
        b.name.toLowerCase() === n ||
        b.token === n ||
        (b.aliases ?? []).some((a) => a === n),
    ) ?? null
  );
}

/** Brands mentioned by name in free text (word-boundary match). */
export function brandsMentioned(text: string): Brand[] {
  const lower = text.toLowerCase();
  return BRANDS.filter((b) => {
    const names = [b.name.toLowerCase(), ...(b.aliases ?? [])];
    // Short tokens like "ups", "att", "ssa", "irs" only count as whole words.
    return names.some((n) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(n)}([^a-z0-9]|$)`).test(lower));
  });
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
