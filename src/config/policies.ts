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
  {
    id: "independent",
    title: "Independent retailer",
    body: "We are an independent store, not affiliated with, endorsed or sponsored by Rockstar Games or Take-Two Interactive.",
    icon: "store",
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
 * FAQ. "verified" answers use confirmed game facts and render on the live site
 * (and in FAQPage structured data). "draft" answers depend on retailer policies that are
 * not confirmed yet: hidden in production, shown (without any visible tag) only when
 * NEXT_PUBLIC_CONTENT_PREVIEW=1. Replace a draft's text with the real policy, then mark it verified.
 */
export type FaqItem = { id: string; question: string; answer: string; status: "verified" | "draft"; source?: string };

export const faq: FaqItem[] = [
  {
    id: "difference",
    question: "What is the difference between GTA VI Standard and Ultimate Edition?",
    answer:
      "Both editions include the full Grand Theft Auto VI game. GTA VI Ultimate Edition adds 16 exclusive in-game items on top of it, including the ’95 Grotti Cheetah, the Hawk and Little Morgan Revolvers, Vice City Styles and the Classic Car Collection. Standard Edition is the base game only.",
    status: "verified",
    source: "store.rockstargames.com/game/buy-gta-vi",
  },
  {
    id: "ultimate-contents",
    question: "What is included in GTA VI Ultimate Edition?",
    answer:
      "GTA VI Ultimate Edition includes the Digital Standard Edition plus: ’95 Grotti Cheetah, ’67 Vapid Dominator Buggy, Shitzu Squalo, Ganado Retro Build, Jason’s Safehouse Vehicles, Classic Car Collection, Hawk and Little Morgan Revolvers, Personalized Weapon Variants, Vice City Styles, Goodtime Gear, Rideout Customs Mod Shop, One-Eyed Willie’s Mod Shop, Sara’s Unisex Salon, Stock 305 Clothing Store, Electric Fang Tattoo Parlor and PTT Youngin$ Compound.",
    status: "verified",
    source: "store.rockstargames.com/game/buy-gta-vi",
  },
  {
    id: "platforms",
    question: "Which platforms is GTA VI available on?",
    answer: "Grand Theft Auto VI is available on PlayStation 5 and Xbox Series X|S. It was released on November 19, 2026.",
    status: "verified",
    source: "rockstargames.com/VI",
  },
  {
    id: "delivery",
    question: "How do I receive my GTA VI digital game code?",
    answer: "How and when your GTA VI digital game code is delivered will be confirmed here before checkout opens.",
    status: "draft",
  },
  {
    id: "activation",
    question: "How do I activate GTA VI on PS5 or Xbox Series X|S?",
    answer: "Step-by-step activation for PS5 and Xbox Series X|S codes will be added once our code supplier and code type are confirmed.",
    status: "draft",
  },
  {
    id: "region",
    question: "Are GTA VI game codes region-locked?",
    answer: "Region details for every code we sell will be confirmed here before checkout opens.",
    status: "draft",
  },
  {
    id: "code-in-box",
    question: "What is a GTA VI code-in-box edition?",
    answer:
      "A code-in-box edition is a physical box that contains a download code instead of a game disc. Rockstar’s own physical version of GTA VI works this way: you redeem the code on your console and download the game.",
    status: "verified",
    source: "store.rockstargames.com/game/buy-gta-vi",
  },
  {
    id: "early-bonuses",
    question: "Can I still claim GTA VI early purchase bonuses?",
    answer:
      "As of November 20, 2026, Rockstar’s store no longer lists GTA VI early purchase bonuses. Whether any bonus applies to orders from this store will be confirmed here.",
    status: "draft",
  },
  {
    id: "gta-plus",
    question: "How do I redeem the free month of GTA+?",
    answer: "The free month of GTA+ was a Rockstar early purchase bonus. Whether it applies to orders from this store will be confirmed here.",
    status: "draft",
  },
  { id: "refunds", question: "What is your refund policy?", answer: "Our refund policy will be published here before checkout opens.", status: "draft" },
  { id: "receipt", question: "Where can I find my GTA VI order receipt?", answer: "Receipt details will be confirmed here before checkout opens.", status: "draft" },
  { id: "tracking", question: "How can I track my GTA VI order?", answer: "Order tracking details will be confirmed here before checkout opens.", status: "draft" },
];
