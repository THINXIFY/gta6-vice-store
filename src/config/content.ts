/** Marketing copy, kept separate from product facts so it can change freely. */
export const heroCopy = {
  eyebrow: "Welcome to Leonida",
  /** Display headline, one entry per line. */
  headlineLines: ["Vice City.", "Your rules."],
  product: "Grand Theft Auto VI",
  description: "Neon nights, sun-soaked streets and a story that’s yours to write. Leonida is open.",
  primaryCta: { label: "Get GTA VI", href: "#editions" },
  secondaryCta: { label: "Watch trailer", href: "#trailers" },
} as const;

export const purchaseCopy = {
  heading: "Your next adventure starts here.",
  checkoutClosed: "Checkout opens once delivery and payment details are confirmed.",
  checkoutPreview: "Preview checkout. No real payments are taken.",
  payWith: "Pay with USDT, BTC, ETH, BNB, USDC and more. Guest checkout.",
} as const;

export const compareCopy = {
  heading: "Compare GTA VI editions",
  subheading: "Choose how you experience Leonida.",
  lead: "Both editions include the full game. Ultimate Edition adds 16 in-game extras across vehicles, weapons, style and places.",
} as const;

export const exploreCopy = {
  kicker: "Life in",
  title: "Leonida",
  regionsLabel: "Six regions. One state.",
} as const;

export const trailersCopy = {
  eyebrow: "The world in motion",
  heading: "See Leonida come to life.",
  note: "Official trailers from Rockstar Games, played through YouTube.",
} as const;

export const galleryCopy = {
  heading: "A closer look at Leonida.",
} as const;

export const closingCopy = {
  heading: "Leonida is waiting.",
  body: "Pick your platform and edition, then pay with crypto in a few steps.",
  cta: "Explore editions",
} as const;

export const charactersCopy = {
  heading: "Two lives. One story.",
} as const;

export const assuranceCopy = {
  heading: "Your next adventure, made simple.",
  /** Used when the purchase steps are not confirmed yet and only reassurances show. */
  headingWithoutSteps: "Good to know before you buy.",
  assurancesLabel: "Good to know",
} as const;

export const faqCopy = { heading: "Frequently asked questions about GTA VI" } as const;
