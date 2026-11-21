import "server-only";
import type { PageId } from "./site";

/**
 * Information and policy pages. SERVER-ONLY (draft text never reaches client bundles).
 *
 * Original drafts that describe how this store actually works (manual crypto payments,
 * human verification, authorised delivery, what data is kept). Anything not yet confirmed
 * by the business is written as {{...}} and renders as a visible "To confirm" marker.
 * Never replace a marker with a guess. Publish a page by resolving every marker, then
 * setting `published: true` in site.pages (src/config/site.ts) and `updated` here.
 */

export type Block = string | { list: string[] };
export type Section = { id: string; heading: string; body: Block[] };
export type InfoPage = {
  id: PageId;
  /** Browser/SEO title (under 60 characters). */
  title: string;
  heading: string;
  /** Meta description (under 160 characters). */
  description: string;
  /** schema.org type for the page's structured data. */
  schemaType: "WebPage" | "AboutPage" | "ContactPage";
  /** ISO date of the last confirmed revision; null while drafting. */
  updated: string | null;
  intro: string;
  sections: Section[];
};

const SELLER = "{{seller legal name}}";

export const infoPages: Record<PageId, InfoPage> = {
  about: {
    id: "about",
    title: "About us",
    heading: "About VICE STORE",
    description: "Who we are, what we sell and how we work: a store for Grand Theft Auto VI with manual, human-checked cryptocurrency payments.",
    schemaType: "AboutPage",
    updated: null,
    intro: "VICE STORE is an online store for Grand Theft Auto VI on PlayStation 5 and Xbox Series X|S. We are not Rockstar Games or Take-Two Interactive, and we are not affiliated with, endorsed or sponsored by them.",
    sections: [
      {
        id: "what-we-do",
        heading: "What we do",
        body: [
          "We help you compare the game's editions, choose your platform and buy a digital copy. Edition contents and game facts on this site come from official sources and are shown only once verified.",
          "We sell only game keys or access that we are authorised to resell. {{reseller authorisation and supplier details}}",
        ],
      },
      {
        id: "how-we-work",
        heading: "How buying works",
        body: [
          {
            list: [
              "You choose an edition and pay in cryptocurrency at a price locked for 30 minutes.",
              "You submit your transaction hash and a screenshot. A member of our team checks the transaction on the public blockchain. Payments are never approved automatically.",
              "After your payment is verified, your game is released on your private order page and we email you a secure link.",
            ],
          },
        ],
      },
      {
        id: "who-we-are",
        heading: "Who we are",
        body: [`This store is operated by ${SELLER}, registered in {{country of registration}} under {{company registration number}}. Registered address: {{business address}}.`],
      },
      {
        id: "independence",
        heading: "Our independence",
        body: [
          "Grand Theft Auto and related marks are trademarks of Take-Two Interactive Software, Inc. Imagery and trailers are shown only with permission or through official embeds, and credits are listed on our media credits page.",
          "We do not publish customer reviews, ratings or endorsements unless they are genuine and verifiable.",
        ],
      },
    ],
  },

  contact: {
    id: "contact",
    title: "Contact and customer support",
    heading: "Contact us",
    description: "Get help with an order, a cryptocurrency payment, game delivery or a refund request. Send us a message with your Payment ID.",
    schemaType: "ContactPage",
    updated: null,
    intro: "Questions about an order, a payment or your game? Send us a message and include your Payment ID if you have one, so we can find your order quickly.",
    sections: [
      {
        id: "before-you-write",
        heading: "Before you write",
        body: [
          {
            list: [
              "Check your order's progress any time on the order status page with your Payment ID and email.",
              "Payment verification usually takes about 30 minutes after you submit your transaction details. This is a target, not a guarantee.",
              "We will never ask for your wallet's private key, recovery phrase or console account password.",
            ],
          },
        ],
      },
      {
        id: "response",
        heading: "When we reply",
        body: ["We aim to reply within {{support response time}}, {{support hours and time zone}}. You can also email us at {{support email address}}."],
      },
      {
        id: "business",
        heading: "Business details",
        body: [`${SELLER}, {{business address}}. Company registration: {{company registration number}}.`],
      },
    ],
  },

  terms: {
    id: "terms",
    title: "Terms and conditions",
    heading: "Terms & Conditions",
    description: "The terms that apply when you buy from VICE STORE: orders, cryptocurrency payments, manual verification, game delivery, refunds and liability.",
    schemaType: "WebPage",
    updated: null,
    intro: `These terms apply when you use this website or buy from ${SELLER} ("we", "us"). Please read them before placing an order. By placing an order you accept these terms.`,
    sections: [
      {
        id: "who-we-are",
        heading: "1. Who we are",
        body: [`This store is operated by ${SELLER} ({{country of registration}}, {{company registration number}}), {{business address}}. Contact: {{support email address}}. We are not affiliated with Rockstar Games or Take-Two Interactive.`],
      },
      {
        id: "products",
        heading: "2. Products",
        body: [
          "We sell digital copies of Grand Theft Auto VI for the platforms and editions shown at checkout. Edition contents are described from official sources. Platform requirements, online services and age ratings are set by the game's publisher and platform holders.",
          "Games are delivered as {{delivery format: redemption code and/or access link}} for the platform and account region you choose. {{regional restrictions and activation requirements}}",
        ],
      },
      {
        id: "orders",
        heading: "3. Orders and prices",
        body: [
          "Prices are shown in US dollars. At checkout we convert the price to the cryptocurrency you choose using a live exchange rate and lock that amount for 30 minutes. A quote that expires before payment cannot be used; start a new checkout instead.",
          "Your order is accepted only when we have verified your payment. We may decline an order, for example if a product becomes unavailable or a payment cannot be verified, and we will refund verified payments in that case as described in our Refund Policy.",
        ],
      },
      {
        id: "payments",
        heading: "4. Cryptocurrency payments",
        body: [
          {
            list: [
              "Send exactly the quoted amount, in the quoted coin, on the quoted network, to the address shown for your order. Funds sent on another network, in another coin or to another address may be lost and cannot always be recovered.",
              "Network fees are paid by you and are not part of the price.",
              "Blockchain transactions are public and irreversible. We cannot cancel a transaction once it is sent.",
              "After paying, submit your transaction hash (TXID), the amount you sent and a screenshot. A screenshot alone is never proof of payment.",
            ],
          },
          "Every payment is checked manually against the public blockchain: network, coin, receiving address, amount and confirmations. We never approve payments automatically. Our target is about 30 minutes after you submit your details; this is not a guarantee.",
          "If the amount received is lower than quoted, or the details do not match, we will ask you for more information or decline the payment. {{handling of underpayments and overpayments}}",
        ],
      },
      {
        id: "delivery",
        heading: "5. Delivery",
        body: [
          "After verification we release your game on your private order page and email you a secure link to it. For your security the code or link is not included in the email. The emailed link works for 30 days; you can also open your order with the link from your order confirmation.",
          "Keep your code private. Once revealed, a code is treated as delivered. {{delivery timescales and what happens if a code does not work}}",
        ],
      },
      {
        id: "refunds",
        heading: "6. Cancellations and refunds",
        body: ["Your rights to cancel and receive a refund are set out in our Refund Policy, which forms part of these terms. Nothing in these terms affects your statutory rights as a consumer."],
      },
      {
        id: "use",
        heading: "7. Acceptable use",
        body: ["Do not misuse this website, submit false payment information, or try to access other customers' orders or our systems. We may refuse service where we reasonably suspect fraud."],
      },
      {
        id: "liability",
        heading: "8. Liability",
        body: ["{{limitation of liability, as reviewed by a legal adviser for the governing jurisdiction}}"],
      },
      {
        id: "law",
        heading: "9. Governing law and disputes",
        body: ["These terms are governed by the laws of {{governing law}}. {{courts or dispute resolution body}}"],
      },
      {
        id: "changes",
        heading: "10. Changes",
        body: ["We may update these terms. The version that applies to your order is the one shown when you placed it. The date of the latest version is shown at the top of this page."],
      },
    ],
  },

  privacy: {
    id: "privacy",
    title: "Privacy policy",
    heading: "Privacy Policy",
    description: "What personal data VICE STORE collects when you order or contact us, why, how long we keep it, who we share it with and your rights.",
    schemaType: "WebPage",
    updated: null,
    intro: `This policy explains how ${SELLER} ("we") handles personal data when you use this website, place an order or contact us. We collect only what we need to sell and deliver your game and to support you.`,
    sections: [
      {
        id: "controller",
        heading: "Who is responsible",
        body: [`${SELLER}, {{business address}}, is the data controller. Contact: {{privacy contact email}}. {{data protection officer or EU/UK representative, if required}}`],
      },
      {
        id: "data",
        heading: "What we collect",
        body: [
          {
            list: [
              "Order details: your email address, console account region, chosen edition and platform, price, cryptocurrency, network and order history.",
              "Payment details you submit: transaction hash, amount sent, optional message and a screenshot of the payment. We never ask for or store wallet private keys or recovery phrases.",
              "Support messages: your name (optional), email address, Payment ID and message.",
              "Technical data: a one-way hash of your IP address for security and rate limiting, and server logs.",
            ],
          },
          "Cryptocurrency transactions are recorded on public blockchains by their nature. We do not control that public record.",
        ],
      },
      {
        id: "purposes",
        heading: "Why we use it",
        body: [
          {
            list: [
              "To take, verify and deliver your order, and to send emails about it (contract).",
              "To prevent fraud and secure our systems (legitimate interests).",
              "To answer your messages (legitimate interests, or contract where it concerns an order).",
              "To keep records required by law, such as accounting records ({{legal obligations that apply}}).",
            ],
          },
          "We do not sell your personal data and do not use it for advertising profiles.",
        ],
      },
      {
        id: "retention",
        heading: "How long we keep it",
        body: [
          "Payment screenshots are kept for 90 days after an order is closed, then deleted by our staff; a size and fingerprint record remains for audit. {{confirm the screenshot deletion schedule}} Order and payment records are kept for {{order record retention period}}. Support messages are kept for {{support message retention period}}.",
        ],
      },
      {
        id: "sharing",
        heading: "Who we share it with",
        body: [
          {
            list: [
              "Our hosting provider: {{hosting provider and location}}.",
              "Our email delivery provider, to send order emails: {{email provider}}.",
              "Exchange-rate services (CoinGecko, with Coinbase as a fallback) are queried by our server for prices only. No personal data is sent to them.",
              "Block explorers are linked for transparency; opening one is a visit to that third-party site under its own policy.",
              "YouTube trailers load only when you press play, using YouTube's privacy-enhanced mode. Google's privacy policy then applies to that video.",
              "Authorities, when the law requires it.",
            ],
          },
          "{{international transfers and safeguards, if any provider is outside your region}}",
        ],
      },
      {
        id: "advertising",
        heading: "Advertising",
        body: [
          "This website does not currently show advertising and does not use advertising cookies.",
          "If we add advertising in future, for example Google AdSense, we will update this policy first. Third-party vendors, including Google, may then use cookies to serve ads based on your visits to this and other websites, and you will be able to opt out of personalised advertising in Google's Ads Settings. Where the law requires consent, ads and their cookies will load only after you agree.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies and local storage",
        body: ["We use no tracking or analytics cookies. See our Cookie Policy for the small amount of essential storage we use."],
      },
      {
        id: "security",
        heading: "Security",
        body: ["Game codes are stored encrypted. {{confirm HTTPS and encryption at rest with the hosting provider}} Payment screenshots and order details are visible only to signed-in staff, and staff access is recorded in an audit log."],
      },
      {
        id: "rights",
        heading: "Your rights",
        body: [
          "Depending on where you live, you may have the right to access, correct, delete or export your data, to object to or restrict its use, and to complain to a data protection authority ({{relevant supervisory authority}}). To use these rights, contact us with your Payment ID. Some records must be kept for legal or fraud-prevention reasons.",
        ],
      },
      {
        id: "children",
        heading: "Children",
        body: ["Grand Theft Auto VI is intended for adults. This store is not directed at children and we do not knowingly collect data from them. {{minimum age to purchase}}"],
      },
      {
        id: "changes",
        heading: "Changes to this policy",
        body: ["We will post any changes here and update the date at the top of the page."],
      },
    ],
  },

  refunds: {
    id: "refunds",
    title: "Refund policy",
    heading: "Refund Policy",
    description: "When VICE STORE refunds cryptocurrency payments for Grand Theft Auto VI orders, how to ask for a refund and how refunds are paid.",
    schemaType: "WebPage",
    updated: null,
    intro: "This policy explains when you can get a refund and how it works for cryptocurrency payments. It does not affect your statutory rights.",
    sections: [
      {
        id: "before-delivery",
        heading: "Before your game is delivered",
        body: [
          "If we cannot verify your payment and decline it, or we cannot deliver the game you ordered, we will refund the payment we received. {{cancellation rights before delivery}}",
        ],
      },
      {
        id: "after-delivery",
        heading: "After your game is delivered",
        body: [
          "Digital codes cannot be returned once revealed. {{consumer right-of-withdrawal wording for digital content, as applicable}}",
          "If a code we delivered does not work, contact us with your Payment ID and a screenshot of the error. We will investigate with our supplier and replace the code or refund you if it is faulty. {{time limit for reporting a faulty code}}",
        ],
      },
      {
        id: "how-paid",
        heading: "How refunds are paid",
        body: [
          {
            list: [
              "Refunds are paid in {{refund currency and basis: same coin and amount received, or USD value at a stated time}}.",
              "We send refunds to a wallet address you confirm in writing, on the same network you paid on.",
              "Blockchain network fees for the refund are paid by {{who pays refund network fees}}.",
              "We aim to send refunds within {{refund processing time}} of agreeing them.",
            ],
          },
        ],
      },
      {
        id: "not-refundable",
        heading: "Payments we cannot recover",
        body: ["Funds sent to the wrong address, on the wrong network or in the wrong coin may be impossible for us to access or return. We will help where we technically can, but cannot guarantee recovery."],
      },
      {
        id: "how-to-ask",
        heading: "How to ask for a refund",
        body: ["Use our contact form or email {{support email address}} with your Payment ID, the reason and, for faulty codes, a screenshot. We will reply within {{support response time}}."],
      },
    ],
  },

  cookies: {
    id: "cookies",
    title: "Cookie policy",
    heading: "Cookie Policy",
    description: "The cookies and browser storage VICE STORE uses, why they are needed, third-party content such as YouTube, and how advertising consent would work.",
    schemaType: "WebPage",
    updated: null,
    intro: "Cookies and similar storage are small pieces of data a website keeps in your browser. We keep their use to the minimum needed for the store to work.",
    sections: [
      {
        id: "what-we-use",
        heading: "What we use",
        body: [
          {
            list: [
              "Order access (browser local storage): after checkout we store your order's private access key in your browser so you can reopen your order and see your game. It stays on your device; clearing site data removes it.",
              "Staff sign-in cookie (vice_admin): used only on our staff dashboard, never on customer pages.",
              "Display preferences and security: no cookies are set for these; the site works without them.",
            ],
          },
          "We do not use analytics, tracking or advertising cookies.",
        ],
      },
      {
        id: "third-party",
        heading: "Third-party content",
        body: ["Trailers are embedded from YouTube in privacy-enhanced mode and load only when you press play. YouTube may then store data in your browser under Google's policies."],
      },
      {
        id: "consent",
        heading: "Consent",
        body: [
          "The storage above is strictly necessary for features you ask for, so it does not require consent. If we ever add non-essential cookies, such as advertising (for example Google AdSense) or analytics, we will ask for your consent first where the law requires it, through a consent banner that lets you accept or refuse, and update this page.",
        ],
      },
      {
        id: "control",
        heading: "Controlling storage",
        body: ["You can delete cookies and site data in your browser settings at any time. If you remove your order access key, you can still check your order with your Payment ID and email."],
      },
    ],
  },
};

/** Unresolved {{markers}} on a page (publishing checklist). */
export const pendingItems = (page: InfoPage) =>
  [page.intro, ...page.sections.flatMap((s) => s.body.flatMap((b) => (typeof b === "string" ? [b] : b.list)))].flatMap((t) => [...t.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]!));
