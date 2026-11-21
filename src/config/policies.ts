/**
 * Commercial and policy copy that may still be unconfirmed.
 *
 * SERVER-ONLY: import this module from server components only (never from a "use client"
 * file), so draft text is never bundled into client JavaScript. Drafts render only when
 * NEXT_PUBLIC_CONTENT_PREVIEW=1 (local); live builds contain verified entries only.
 * To publish: replace a draft's text with the confirmed policy, then set status "verified".
 */

export type PolicyStatus = "verified" | "draft";

/** Purchase steps. The section shows in production only when every step is verified. */
export type Step = { id: string; title: string; body: string; status: PolicyStatus };
export const steps: Step[] = [
  {
    id: "choose",
    title: "Choose your edition",
    body: "Pick PlayStation 5 or Xbox Series X|S, then Standard or Ultimate Edition. Your choice carries through the page.",
    status: "verified",
  },
  {
    id: "purchase",
    title: "Complete your purchase",
    body: "Checkout and accepted payment methods will be described here once our payment provider is confirmed.",
    status: "draft",
  },
  {
    id: "receive",
    title: "Receive and activate your game",
    body: "How your game is delivered, how long it takes and how to activate it on your console will be confirmed here.",
    status: "draft",
  },
];

/** Customer reassurances. Only verified entries render in production (and in the purchase panel). */
export type Assurance = { id: string; title: string; body: string; icon: "lock" | "badge" | "send" | "console" | "globe" | "help" | "undo" | "store"; status: PolicyStatus };
export const assurances: Assurance[] = [
  {
    id: "platforms",
    title: "Platform compatibility",
    body: "Grand Theft Auto VI is available on PlayStation 5 and Xbox Series X|S. Choose your platform before you buy.",
    icon: "console",
    status: "verified",
  },
  { id: "payment", title: "Secure payment", body: "Our payment provider and accepted payment methods will be listed here once confirmed.", icon: "lock", status: "draft" },
  { id: "authenticity", title: "Game authenticity", body: "Where our game codes come from will be stated here once our supply agreement is confirmed.", icon: "badge", status: "draft" },
  { id: "delivery", title: "Delivery information", body: "Delivery method and timing will be confirmed here before checkout opens.", icon: "send", status: "draft" },
  { id: "region", title: "Regional compatibility", body: "Region details for every code we sell will be confirmed here before checkout opens.", icon: "globe", status: "draft" },
  { id: "support", title: "Customer support", body: "Support hours and contact details will be published here before checkout opens.", icon: "help", status: "draft" },
  { id: "refunds", title: "Refund policy", body: "Our refund policy will be published here before checkout opens.", icon: "undo", status: "draft" },
];

/**
 * FAQ. Answers lead with the direct answer (answer engines quote the first sentence).
 * - status "verified": confirmed from an official source (or attributed to one) or by how this
 *   store actually works; "draft": business terms not confirmed yet (content preview only).
 * - requires "checkout": describes buying from this store, so it shows only while checkout is
 *   available (preview now, live once checkout opens). Never in structured data before then.
 */
export type FaqItem = {
  id: string;
  group: "game" | "buying";
  question: string;
  answer: string;
  status: "verified" | "draft";
  requires?: "checkout";
  source?: string;
};

export const faqGroups = [
  { id: "game", label: "The game" },
  { id: "buying", label: "Buying from us" },
] as const;

export const faq: FaqItem[] = [
  // ── The game ──────────────────────────────────────────────────────────────
  {
    id: "difference",
    group: "game",
    question: "What is the difference between GTA VI Standard and Ultimate Edition?",
    answer:
      "Both editions include the full Grand Theft Auto VI game. Ultimate Edition adds 16 exclusive in-game items on top, including the ’95 Grotti Cheetah, the Hawk and Little Morgan Revolvers, Vice City Styles and the Classic Car Collection. Standard Edition is the base game only.",
    status: "verified",
    source: "store.rockstargames.com/game/buy-gta-vi",
  },
  {
    id: "ultimate-contents",
    group: "game",
    question: "What is included in GTA VI Ultimate Edition?",
    answer:
      "Ultimate Edition includes the Digital Standard Edition plus 16 extras: ’95 Grotti Cheetah, ’67 Vapid Dominator Buggy, Shitzu Squalo, Ganado Retro Build, Jason’s Safehouse Vehicles, Classic Car Collection, Hawk and Little Morgan Revolvers, Personalized Weapon Variants, Vice City Styles, Goodtime Gear, Rideout Customs Mod Shop, One-Eyed Willie’s Mod Shop, Sara’s Unisex Salon, Stock 305 Clothing Store, Electric Fang Tattoo Parlor and PTT Youngin$ Compound.",
    status: "verified",
    source: "store.rockstargames.com/game/buy-gta-vi",
  },
  {
    id: "upgrade",
    group: "game",
    question: "Can I upgrade from Standard to Ultimate Edition later?",
    answer:
      "Yes. Rockstar says Standard Edition owners can buy the Ultimate Edition Upgrade separately at any time from the PlayStation Store or the Microsoft Store. If your Standard Edition came as a code, redeem it first.",
    status: "verified",
    source: "support.rockstargames.com/articles/4QfG4FmZCf5W1gS8jy4UVT (Platforms, Editions, and Versions)",
  },
  {
    id: "platforms",
    group: "game",
    question: "Which platforms is GTA VI available on?",
    answer: "Grand Theft Auto VI is available on PlayStation 5 and Xbox Series X|S. It was released on November 19, 2026.",
    status: "verified",
    source: "rockstargames.com/VI",
  },
  {
    id: "series-s",
    group: "game",
    question: "Can I play GTA VI on Xbox Series S?",
    answer:
      "Yes. GTA VI supports Xbox Series X|S, including Series S. Digital Foundry’s launch analysis found the Series S version runs at a lower resolution, with less stable frame rates than Xbox Series X and PS5.",
    status: "verified",
    source: "Digital Foundry console analysis, reported by VGC and LevelUp (November 2026)",
  },
  {
    id: "region",
    group: "game",
    question: "Are GTA VI game codes region-locked?",
    answer:
      "On PlayStation 5, yes. According to Rockstar Support, a PS5 download code only redeems on a PlayStation Network account from the matching region. Xbox Series X|S codes are reported to have no region lock. Check your console account’s region before you buy; you choose it at checkout.",
    status: "verified",
    source: "Rockstar Support, reported by Notebookcheck, Insider Gaming and Wccftech (November 2026)",
  },
  {
    id: "code-in-box",
    group: "game",
    question: "What is a GTA VI code-in-box edition?",
    answer:
      "A code-in-box edition is a physical box that contains a download code instead of a game disc. Rockstar’s own physical version of GTA VI works this way: you redeem the code on your console and download the game.",
    status: "verified",
    source: "store.rockstargames.com/game/buy-gta-vi",
  },
  {
    id: "early-bonuses",
    group: "game",
    question: "Can I still get GTA VI pre-order bonuses?",
    answer:
      "No. Rockstar’s early purchase bonuses, such as the Vintage Vice City Pack and the free month of GTA+, applied to purchases made before November 20, 2026. Rockstar’s store no longer lists them, so new purchases do not include them.",
    status: "verified",
    source: "rockstargames.com/VI and store.rockstargames.com (rendered 2026-11-20)",
  },

  // ── Buying from us (how this store works; shown while checkout is available) ──
  {
    id: "payment",
    group: "buying",
    question: "How do I pay for GTA VI here?",
    answer:
      "You pay in cryptocurrency. Choose your edition, platform and a coin and network at checkout, and we lock the exact amount for 30 minutes. Send exactly that amount to the address shown, then submit your transaction hash and a screenshot of the payment.",
    status: "verified",
    requires: "checkout",
  },
  {
    id: "verification",
    group: "buying",
    question: "How long does payment verification take?",
    answer:
      "Our target is about 30 minutes after you submit your transaction details. A member of our team checks every payment on the blockchain: network, coin, amount and confirmations. Nothing is approved automatically.",
    status: "verified",
    requires: "checkout",
  },
  {
    id: "delivery",
    group: "buying",
    question: "How do I receive my GTA VI digital game code?",
    answer:
      "When your payment is verified and your order is released, your code appears on your private order page and we email you a secure link to it. For your security, the code itself is never sent by email.",
    status: "verified",
    requires: "checkout",
  },
  {
    id: "activation",
    group: "buying",
    question: "How do I redeem a GTA VI code on PS5 or Xbox?",
    answer:
      "On PS5, open the PlayStation Store, select the menu at the top of the screen, choose Redeem Code and enter your code. On Xbox Series X|S, open the Microsoft Store, choose Redeem and enter your code, or redeem it at redeem.microsoft.com. The game then downloads to your console.",
    status: "verified",
    requires: "checkout",
  },
  {
    id: "tracking",
    group: "buying",
    question: "How can I track my GTA VI order?",
    answer:
      "Open the order status page and enter your Payment ID and the email you used at checkout. You can also reopen your order any time with the private link from your confirmation email.",
    status: "verified",
    requires: "checkout",
  },
  {
    id: "receipt",
    group: "buying",
    question: "Will I get an order confirmation?",
    answer:
      "Yes. We email you when your order is created (with your Payment ID and payment details), when we receive your payment details, when your payment is verified and when your game is ready.",
    status: "verified",
    requires: "checkout",
  },
  {
    id: "refunds",
    group: "buying",
    question: "What is your refund policy?",
    answer: "Our refund policy will be published here before checkout opens.",
    status: "draft",
    requires: "checkout",
  },
];
