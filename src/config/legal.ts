import "server-only";
import { brand } from "@/brand/brand";
import type { PageId } from "./site";

/**
 * Information and policy pages. SERVER-ONLY (draft text never reaches client bundles).
 *
 * Written from how this store actually works (manual crypto payments, human verification,
 * delivery on a private order page, what data is kept). Business facts that are not confirmed
 * (legal entity, address, registration, governing law) are deliberately not stated: add them
 * here or in Admin → Content once confirmed. A `{{...}}` marker renders as a visible "To confirm"
 * chip and blocks publishing; never replace one with a guess.
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
  /** "The short version": three to five plain-language key points (policy pages). */
  summary?: string[];
  sections: Section[];
};

const EMAIL = brand.support.email;
const STORE = brand.name;
const UPDATED = "2026-11-24";

export const infoPages: Record<PageId, InfoPage> = {
  about: {
    id: "about",
    title: "About us",
    heading: `About ${STORE}`,
    description: `${STORE} is an independent online store for Grand Theft Auto VI on PS5 and Xbox Series X|S, with human-checked cryptocurrency payments.`,
    schemaType: "AboutPage",
    updated: UPDATED,
    intro: `${STORE} is an independent online store for Grand Theft Auto VI on PlayStation 5 and Xbox Series X|S. We built it for players who want a clear choice of edition, a simple way to pay in cryptocurrency and a real person checking every order.`,
    sections: [
      {
        id: "what-we-do",
        heading: "What we do",
        body: [
          "We help you compare the game's editions, choose your platform and buy a digital copy without the guesswork. Edition contents and game facts on this site come from official sources, and we show them only once they are verified.",
          "Prices are shown in US dollars and stay the same whichever coin you pay with: the cryptocurrency amount is calculated at checkout from a live exchange rate.",
        ],
      },
      {
        id: "how-we-work",
        heading: "How buying works",
        body: [
          {
            list: [
              "Choose your edition and platform, then pay in cryptocurrency at an amount locked for 30 minutes.",
              "Submit your transaction hash and a screenshot. A member of our team checks it on the public blockchain. Payments are never approved automatically.",
              "Once your payment is confirmed, your game appears on your private order page and we email you a secure link to download it.",
            ],
          },
        ],
      },
      {
        id: "principles",
        heading: "What we stand for",
        body: [
          {
            list: [
              "Clear prices: the price you see is the price you pay, before your own network fee.",
              "People, not bots: every payment is checked by hand before anything is released.",
              "Privacy by default: we collect only what an order needs and never ask for wallet keys, recovery phrases or console passwords.",
              "Honest information: no invented reviews, discounts or stock levels.",
            ],
          },
        ],
      },
      {
        id: "talk-to-us",
        heading: "Talk to us",
        body: [`Questions before or after you buy? Write to ${EMAIL} or use our contact form. Include your Payment ID if you have one, so we can find your order quickly.`],
      },
    ],
  },

  contact: {
    id: "contact",
    title: "Contact and customer support",
    heading: "Contact us",
    description: `Get help with an order, a crypto payment, game delivery or a refund. Message ${STORE} support or email ${EMAIL}.`,
    schemaType: "ContactPage",
    updated: UPDATED,
    intro: "Questions about an order, a payment or your game? Send us a message below. If you have a Payment ID, include it so we can find your order straight away.",
    sections: [
      {
        id: "verification-time",
        heading: "How long does payment verification take?",
        body: ["Usually about 30 minutes after you submit your transaction details, once the network has confirmed the transaction. This is a target, not a guarantee: busy networks and extra checks can take longer. You can follow progress on the order status page."],
      },
      {
        id: "find-order",
        heading: "Where do I find my game?",
        body: ["On your private order page. After your payment is confirmed, we also email you a secure link to it. For your security the code itself is never sent by email."],
      },
      {
        id: "wrong-amount",
        heading: "I sent the wrong amount or used the wrong network",
        body: ["Contact us with your Payment ID and transaction hash before sending anything else. We will check what arrived and tell you the options. Funds sent on the wrong network or to the wrong address may not be recoverable."],
      },
      {
        id: "safety",
        heading: "Will you ever ask for my wallet keys or passwords?",
        body: ["Never. We will never ask for your wallet's private key, recovery phrase, or your console account password. Anyone who does is not us."],
      },
      {
        id: "refund",
        heading: "How do I ask for a refund?",
        body: ["Send us a message with the topic \"A refund\", your Payment ID and the reason. Our Refund & Cancellation Policy explains when refunds apply and how they are paid."],
      },
    ],
  },

  terms: {
    id: "terms",
    title: "Terms and conditions",
    heading: "Terms & Conditions",
    description: `The terms for buying from ${STORE}: orders, cryptocurrency payments, manual verification, digital delivery, refunds, acceptable use and liability.`,
    schemaType: "WebPage",
    updated: UPDATED,
    intro: `These terms apply when you use this website or buy from ${STORE} ("we", "us", "our"). Please read them before placing an order: by placing an order you agree to them.`,
    summary: [
      "You buy a digital copy of Grand Theft Auto VI for the platform and edition you choose.",
      "You pay in cryptocurrency; every payment is checked by a person before your game is released.",
      "Blockchain payments cannot be reversed, so send exactly the quoted amount on the quoted network.",
      "Your game is delivered on your private order page; keep your code private.",
      "Your statutory rights as a consumer are not affected.",
    ],
    sections: [
      {
        id: "about-us",
        heading: "1. About us",
        body: [`${STORE} is an independent online store for digital games, operating at this website. You can contact us at ${EMAIL} or through our contact page.`],
      },
      {
        id: "eligibility",
        heading: "2. Who can buy",
        body: [
          "Grand Theft Auto VI is rated for adults. To place an order you must be at least 18 years old, or the age of majority where you live if that is higher, and able to enter into a binding contract.",
          "You are responsible for making sure the game, its edition and your console account region are suitable for you and allowed where you live.",
        ],
      },
      {
        id: "products",
        heading: "3. Products",
        body: [
          "We sell digital copies of Grand Theft Auto VI for the platforms and editions shown at checkout. Edition contents are described from official sources. System requirements, online services, account rules and age ratings are set by the game's publisher and the platform holders, and their own terms apply when you redeem and play the game.",
          "Product images are for illustration. If an edition's contents are changed by the publisher, the publisher's description at the time of delivery applies.",
        ],
      },
      {
        id: "orders",
        heading: "4. Orders and prices",
        body: [
          "Prices are shown in US dollars. At checkout we convert the price into the cryptocurrency you choose using a live exchange rate and lock that amount for 30 minutes. A quote that expires before you pay cannot be used: start a new checkout instead.",
          "Your order is accepted only once we have verified your payment. We may decline an order, for example if a product becomes unavailable, a price was shown in obvious error, or a payment cannot be verified. If we decline an order after receiving your payment, we refund it as described in our Refund & Cancellation Policy.",
        ],
      },
      {
        id: "payments",
        heading: "5. Cryptocurrency payments",
        body: [
          {
            list: [
              "Send exactly the quoted amount, in the quoted coin, on the quoted network, to the address shown for your order.",
              "Funds sent on another network, in another coin or to another address may be lost and cannot always be recovered.",
              "Network fees are paid by you and are not part of the price.",
              "Blockchain transactions are public and irreversible: we cannot cancel a transaction once it has been sent.",
              "After paying, submit your transaction hash (TXID), the amount you sent and a screenshot. A screenshot alone is never proof of payment.",
            ],
          },
          "Every payment is checked by a person against the public blockchain: network, coin, receiving address, amount and confirmations. We never approve payments automatically. Our target is about 30 minutes after you submit your details; this is not a guarantee.",
          "If the amount received is lower than quoted, or the details do not match, we will contact you to resolve it before your order can proceed, or decline the payment and refund what we received.",
        ],
      },
      {
        id: "delivery",
        heading: "6. Delivery",
        body: [
          "After verification we release your game on your private order page and email you a secure link to it. For your security the code itself is not included in the email. The emailed link stays valid for 30 days, and you can also reopen your order with the link from your order confirmation.",
          "Keep your code private. Once it has been revealed on your order page, it is treated as delivered. If a code does not work, contact us as described in our Refund & Cancellation Policy.",
        ],
      },
      {
        id: "cancellations",
        heading: "7. Cancellations and refunds",
        body: ["When you can cancel and how refunds work is set out in our Refund & Cancellation Policy, which forms part of these terms."],
      },
      {
        id: "acceptable-use",
        heading: "8. Acceptable use",
        body: [
          {
            list: [
              "Do not submit false payment details or someone else's transaction.",
              "Do not try to access other customers' orders, our dashboard or our systems.",
              "Do not resell or publish codes obtained through fraud or chargeback abuse.",
            ],
          },
          "We may refuse or cancel an order where we reasonably suspect fraud or misuse.",
        ],
      },
      {
        id: "intellectual-property",
        heading: "9. Intellectual property",
        body: [
          "Grand Theft Auto and related marks are trademarks of Take-Two Interactive Software, Inc. Other names and marks belong to their owners. Credits for imagery and trailers are listed on our media credits page.",
          `The design, text and original artwork of this website belong to ${STORE}.`,
        ],
      },
      {
        id: "liability",
        heading: "10. Our responsibility to you",
        body: [
          "We are responsible for delivering the product you ordered with reasonable care and skill. We are not responsible for losses caused by events outside our reasonable control, by the publisher's or platform holders' services, or by payments sent to the wrong address or network.",
          "Nothing in these terms limits or excludes liability that cannot be limited or excluded by law, including your statutory rights as a consumer.",
        ],
      },
      {
        id: "law",
        heading: "11. Law and disputes",
        body: [
          `If something goes wrong, please contact us first at ${EMAIL}: most problems can be solved quickly. If you are a consumer, you keep the protection of the mandatory consumer laws of the country where you live, and you may bring a claim in the courts available to you under those laws.`,
        ],
      },
      {
        id: "changes",
        heading: "12. Changes to these terms",
        body: ["We may update these terms from time to time. The version that applies to your order is the one shown when you placed it. The date of the latest version is shown at the top of this page."],
      },
    ],
  },

  privacy: {
    id: "privacy",
    title: "Privacy policy",
    heading: "Privacy Policy",
    description: `What personal data ${STORE} collects when you order or contact us, why, how long it is kept, who it is shared with and your rights.`,
    schemaType: "WebPage",
    updated: UPDATED,
    intro: `This policy explains how ${STORE} ("we") handles personal data when you use this website, place an order or contact us. We collect only what we need to sell and deliver your game and to support you.`,
    summary: [
      "We collect your email, order and payment details, and your messages to us.",
      "We never ask for wallet private keys, recovery phrases or console passwords.",
      "We do not sell your data and do not use advertising or analytics cookies.",
      "Payment screenshots are deleted 90 days after an order is closed.",
      `Questions or requests: ${EMAIL}.`,
    ],
    sections: [
      {
        id: "who",
        heading: "1. Who is responsible",
        body: [`${STORE} is responsible for the personal data described here. For any privacy question or request, contact ${EMAIL}.`],
      },
      {
        id: "data",
        heading: "2. What we collect",
        body: [
          {
            list: [
              "Order details: your email address, console account region, chosen edition and platform, price, cryptocurrency, network and order history.",
              "Payment details you submit: transaction hash, amount sent, an optional message and a screenshot of the payment.",
              "Support messages: your name (optional), email address, Payment ID and message.",
              "Technical data: a one-way hash of your IP address, used for security and rate limiting, and standard server logs.",
            ],
          },
          "We never ask for or store wallet private keys or recovery phrases. Cryptocurrency transactions are recorded on public blockchains by their nature; we do not control that public record.",
        ],
      },
      {
        id: "purposes",
        heading: "3. Why we use it",
        body: [
          {
            list: [
              "To take, verify and deliver your order and send you emails about it (performing our contract with you).",
              "To prevent fraud and keep our systems secure (our legitimate interests).",
              "To answer your messages (our legitimate interests, or our contract where it concerns an order).",
              "To keep the records the law requires, such as accounting records (legal obligation).",
            ],
          },
          "We do not sell your personal data and do not use it to build advertising profiles.",
        ],
      },
      {
        id: "retention",
        heading: "4. How long we keep it",
        body: [
          {
            list: [
              "Payment screenshots: deleted 90 days after the order is closed. A file size and fingerprint record remains for audit.",
              "Order and payment records: for as long as needed to provide support and to meet accounting, tax and fraud-prevention obligations.",
              "Support messages: for as long as needed to resolve your request and handle any follow-up.",
            ],
          },
        ],
      },
      {
        id: "sharing",
        heading: "5. Who we share it with",
        body: [
          {
            list: [
              "Our hosting provider (Hostinger), which runs the servers this store uses.",
              "Our email delivery provider, to send order emails.",
              "Exchange-rate services (CoinGecko, with Coinbase as a fallback) are queried by our server for prices only. No personal data is sent to them.",
              "Block explorers are linked for transparency; opening one visits that third-party site under its own policy.",
              "YouTube trailers load only when you press play, in YouTube's privacy-enhanced mode. Google's privacy policy then applies to that video.",
              "Public authorities, when the law requires it.",
            ],
          },
          "Where a provider processes data outside your country, we rely on the safeguards available under applicable data protection law.",
        ],
      },
      {
        id: "cookies",
        heading: "6. Cookies and local storage",
        body: ["We use no tracking, analytics or advertising cookies. Our Cookie Policy explains the small amount of essential storage the store needs."],
      },
      {
        id: "security",
        heading: "7. Security",
        body: ["The website is served over an encrypted (HTTPS) connection. Game codes are stored encrypted. Payment screenshots and order details are visible only to signed-in staff, staff sign-in uses two-factor authentication, and staff access is recorded in an audit log."],
      },
      {
        id: "rights",
        heading: "8. Your rights",
        body: [
          `Depending on where you live, you may have the right to access, correct, delete or export your data, to object to or restrict its use, and to complain to your local data protection authority. To use these rights, email ${EMAIL} with your Payment ID if you have one. Some records must be kept for legal or fraud-prevention reasons, and we will tell you if that applies.`,
        ],
      },
      {
        id: "children",
        heading: "9. Children",
        body: ["Grand Theft Auto VI is intended for adults. This store is not directed at children, and we do not knowingly collect personal data from anyone under 18."],
      },
      {
        id: "changes",
        heading: "10. Changes to this policy",
        body: ["We will post any changes on this page and update the date at the top."],
      },
    ],
  },

  refunds: {
    id: "refunds",
    title: "Refund and cancellation policy",
    heading: "Refund & Cancellation Policy",
    description: `When ${STORE} refunds or cancels Grand Theft Auto VI orders paid in cryptocurrency, how to ask for a refund and how refunds are paid.`,
    schemaType: "WebPage",
    updated: UPDATED,
    intro: "This policy explains when you can cancel an order or get a refund, and how refunds work for cryptocurrency payments. It does not affect your statutory rights.",
    summary: [
      "If we cannot verify your payment or deliver your game, we refund what we received.",
      "Before your game is delivered, you can ask us to cancel your order.",
      "Once a code has been revealed, it cannot be returned, unless it is faulty.",
      "A faulty code is investigated and replaced, or refunded if it cannot be replaced.",
      "Refunds go to a wallet address you confirm, on the network you paid on.",
    ],
    sections: [
      {
        id: "before-delivery",
        heading: "1. Before your game is delivered",
        body: [
          "You can ask us to cancel your order at any time before your game is released on your order page. If we have already received your payment, we refund it as described below.",
          "If we cannot verify your payment, or cannot deliver the edition you ordered, we decline the order and refund the payment we received.",
        ],
      },
      {
        id: "after-delivery",
        heading: "2. After your game is delivered",
        body: [
          "Digital codes cannot be returned once they have been revealed on your order page, because they can be used immediately. By asking us to release your game, you agree to its immediate delivery. This does not affect your rights if a code is faulty.",
          "If a code we delivered does not work, contact us promptly with your Payment ID and a screenshot of the error message. We investigate with our supplier and replace the code, or refund you if a working replacement cannot be provided.",
        ],
      },
      {
        id: "how-paid",
        heading: "3. How refunds are paid",
        body: [
          {
            list: [
              "Refunds are paid in the same cryptocurrency and on the same network you paid with.",
              "We send refunds only to a wallet address you confirm to us in writing from the email address on your order.",
              "Before sending, we confirm the refund amount with you, including any blockchain network fee for the refund transaction.",
              "We aim to send agreed refunds as soon as reasonably possible.",
            ],
          },
        ],
      },
      {
        id: "unrecoverable",
        heading: "4. Payments we cannot recover",
        body: ["Funds sent to the wrong address, on the wrong network or in the wrong coin may be impossible for us to access or return. We will help where we technically can, but cannot guarantee recovery."],
      },
      {
        id: "how-to-ask",
        heading: "5. How to ask",
        body: [`Use our contact form with the topic "A refund", or email ${EMAIL}, with your Payment ID, the reason and, for a faulty code, a screenshot of the error. We reply by email.`],
      },
    ],
  },

  cookies: {
    id: "cookies",
    title: "Cookie policy",
    heading: "Cookie Policy",
    description: `The cookies and browser storage ${STORE} uses, why they are needed, third-party content such as YouTube, and how consent would work.`,
    schemaType: "WebPage",
    updated: UPDATED,
    intro: "Cookies and similar storage are small pieces of data a website keeps in your browser. We keep their use to the minimum the store needs to work.",
    summary: [
      "No analytics, tracking or advertising cookies.",
      "Your order access key is kept in your own browser so you can reopen your order.",
      "YouTube trailers load only when you press play.",
    ],
    sections: [
      {
        id: "what-we-use",
        heading: "1. What we use",
        body: [
          {
            list: [
              "Order access (browser local storage): after checkout we keep your order's private access key in your browser so you can reopen your order and see your game. It stays on your device; clearing site data removes it.",
              "Staff sign-in cookie (vice_admin): used only on our staff dashboard, never on customer pages.",
              "Convenience settings, such as a remembered selection, may be kept in your browser's local storage. They never leave your device.",
            ],
          },
          "We do not use analytics, tracking or advertising cookies.",
        ],
      },
      {
        id: "third-party",
        heading: "2. Third-party content",
        body: ["Trailers are embedded from YouTube in privacy-enhanced mode and load only when you press play. YouTube may then store data in your browser under Google's policies."],
      },
      {
        id: "consent",
        heading: "3. Consent",
        body: ["The storage above is strictly necessary for features you ask for, so it does not need consent. If we ever add non-essential cookies, such as analytics or advertising, we will ask for your consent first where the law requires it, and update this page before we do."],
      },
      {
        id: "control",
        heading: "4. Controlling storage",
        body: ["You can delete cookies and site data in your browser settings at any time. If you remove your order access key, you can still check your order with your Payment ID and email on the order status page."],
      },
    ],
  },
};

/** Unresolved {{markers}} on a page (publishing checklist). */
export const pendingItems = (page: InfoPage) =>
  [page.intro, ...page.sections.flatMap((s) => s.body.flatMap((b) => (typeof b === "string" ? [b] : b.list)))].flatMap((t) => [...t.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]!));
