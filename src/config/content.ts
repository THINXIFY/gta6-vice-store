/** Marketing copy, kept separate from product facts so it can change freely. */
export const heroCopy = {
  /** H1: the game title (its "VI" is the mark that travels into Editions), then the welcome line. */
  title: "Grand Theft Auto",
  titleMark: "VI",
  subtitle: "Welcome to Leonida.",
  description: "Jason and Lucia against the world — chasing the big score across sun-soaked, neon-lit Leonida.",
  primaryCta: { label: "Get GTA VI", href: "#editions" },
  secondaryCta: { label: "Watch trailer", href: "#trailers" },
} as const;

export const purchaseCopy = {
  heading: "Choose your edition.",
  checkoutClosed: "Checkout opens once delivery and payment details are confirmed.",
  checkoutPreview: "Preview checkout. No real payments are taken.",
} as const;

export const compareCopy = {
  heading: "Compare GTA VI editions",
  subheading: "Choose how you experience Leonida.",
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
  /** Intro beside the "Good to know" cards. */
  intro: "The essentials, in plain words: where it plays, what each edition adds and who you are buying from.",
} as const;

export const faqCopy = {
  heading: "Frequently asked questions about GTA VI",
  intro: "Straight answers about the editions, platforms and codes, and how buying from us works.",
} as const;

/** Shown on the checkout, payment, success and order pages (DeliveryNote). Matches the real flow. */
export const deliveryCopy = {
  title: "Your download link, the moment your payment is confirmed",
  body: "As soon as we confirm your payment, we email you a private link to your order. Open it for your code, redeem it on your PlayStation 5 or Xbox, and the complete Grand Theft Auto VI game downloads straight to your console.",
} as const;
