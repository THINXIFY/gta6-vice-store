/**
 * Cryptocurrency payments (manual verification): what this codebase SUPPORTS — coins, the
 * networks each can be paid on, explorers, confirmations, hash formats.
 *
 * Which methods a store OFFERS, and their receiving addresses, are per client and live only in
 * the database (Admin → Wallets; starting list in src/brand/payments.ts). Never put an address
 * in code. Checkout offers a method when it is enabled and, for live orders, validated with a
 * live address; local preview offers enabled test methods with obviously fake sample addresses.
 */

export type NetworkId = "tron" | "ethereum" | "bsc" | "solana" | "polygon" | "arbitrum" | "base" | "optimism" | "bitcoin" | "litecoin";
export type TxFamily = "evm" | "hex64" | "solana";

export type Network = {
  id: NetworkId;
  name: string;
  /** Token standard shown next to the name, e.g. "TRC20". */
  standard?: string;
  family: TxFamily;
  /** Confirmations an admin should wait for before approving. */
  confirmations: number;
  /** Transaction explorer, `{tx}` is replaced. */
  explorer: string;
  /** Address explorer, `{addr}` is replaced (to check incoming transfers). */
  addressExplorer: string;
};

export const networks: Record<NetworkId, Network> = {
  tron: { id: "tron", name: "Tron", standard: "TRC20", family: "hex64", confirmations: 20, explorer: "https://tronscan.org/#/transaction/{tx}", addressExplorer: "https://tronscan.org/#/address/{addr}" },
  ethereum: { id: "ethereum", name: "Ethereum", standard: "ERC20", family: "evm", confirmations: 12, explorer: "https://etherscan.io/tx/{tx}", addressExplorer: "https://etherscan.io/address/{addr}" },
  bsc: { id: "bsc", name: "BNB Smart Chain", standard: "BEP20", family: "evm", confirmations: 15, explorer: "https://bscscan.com/tx/{tx}", addressExplorer: "https://bscscan.com/address/{addr}" },
  solana: { id: "solana", name: "Solana", standard: "SPL", family: "solana", confirmations: 32, explorer: "https://solscan.io/tx/{tx}", addressExplorer: "https://solscan.io/account/{addr}" },
  polygon: { id: "polygon", name: "Polygon", family: "evm", confirmations: 128, explorer: "https://polygonscan.com/tx/{tx}", addressExplorer: "https://polygonscan.com/address/{addr}" },
  arbitrum: { id: "arbitrum", name: "Arbitrum One", family: "evm", confirmations: 12, explorer: "https://arbiscan.io/tx/{tx}", addressExplorer: "https://arbiscan.io/address/{addr}" },
  base: { id: "base", name: "Base", family: "evm", confirmations: 12, explorer: "https://basescan.org/tx/{tx}", addressExplorer: "https://basescan.org/address/{addr}" },
  optimism: { id: "optimism", name: "Optimism", family: "evm", confirmations: 12, explorer: "https://optimistic.etherscan.io/tx/{tx}", addressExplorer: "https://optimistic.etherscan.io/address/{addr}" },
  bitcoin: { id: "bitcoin", name: "Bitcoin", family: "hex64", confirmations: 2, explorer: "https://mempool.space/tx/{tx}", addressExplorer: "https://mempool.space/address/{addr}" },
  litecoin: { id: "litecoin", name: "Litecoin", family: "hex64", confirmations: 6, explorer: "https://litecoinspace.org/tx/{tx}", addressExplorer: "https://litecoinspace.org/address/{addr}" },
};

export const txPatterns: Record<TxFamily, RegExp> = {
  evm: /^0x[0-9a-fA-F]{64}$/,
  hex64: /^[0-9a-fA-F]{64}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{80,90}$/,
};

export type AssetId = "USDT" | "USDC" | "BTC" | "ETH" | "BNB" | "SOL" | "TRX" | "LTC" | "POL";

export type AssetNetwork = { network: NetworkId };

export type Asset = {
  id: AssetId;
  name: string;
  /** Decimals shown to the customer (amounts round up, never down). */
  decimals: number;
  stable: boolean;
  /** Networks this coin can be offered on (supported, not necessarily offered). */
  networks: AssetNetwork[];
};

const on = (...ids: NetworkId[]): AssetNetwork[] => ids.map((network) => ({ network }));

/** Supported coins, in display order. */
export const assets: Asset[] = [
  { id: "USDT", name: "Tether", decimals: 2, stable: true, networks: on("bsc", "tron", "ethereum", "solana", "polygon", "arbitrum") },
  { id: "USDC", name: "USD Coin", decimals: 2, stable: true, networks: on("ethereum", "bsc", "solana", "polygon", "base", "arbitrum") },
  { id: "BTC", name: "Bitcoin", decimals: 8, stable: false, networks: on("bitcoin") },
  { id: "ETH", name: "Ether", decimals: 6, stable: false, networks: on("ethereum", "arbitrum", "optimism", "base") },
  { id: "BNB", name: "BNB", decimals: 6, stable: false, networks: on("bsc") },
  { id: "SOL", name: "Solana", decimals: 4, stable: false, networks: on("solana") },
  { id: "TRX", name: "TRON", decimals: 2, stable: false, networks: on("tron") },
  { id: "LTC", name: "Litecoin", decimals: 8, stable: false, networks: on("litecoin") },
  { id: "POL", name: "Polygon", decimals: 4, stable: false, networks: on("polygon") },
];

/** Whether a coin can be paid on a network (supported by this codebase). */
export const supports = (asset: string, network: string) => assets.some((a) => a.id === asset && a.networks.some((n) => n.network === network));

/** Display order for methods: coin order, then network order within the coin. */
export const methodRank = (asset: string, network: string) => {
  const a = assets.findIndex((x) => x.id === asset);
  const n = a < 0 ? 99 : assets[a]!.networks.findIndex((x) => x.network === network);
  return (a < 0 ? 99 : a) * 100 + (n < 0 ? 99 : n);
};

/**
 * PREVIEW ONLY: indicative USD rates for laying out amounts. Not live quotes. A real
 * checkout must take a server-side quote with an expiry when the order is created.
 */
export const previewUsdRates: Record<AssetId, number> = {
  USDT: 1, USDC: 1, BTC: 95000, ETH: 3400, BNB: 650, SOL: 180, TRX: 0.25, LTC: 95, POL: 0.45,
};

/** How long a quoted amount stays valid. */
export const quoteMinutes = 30;
/** Target manual processing time after submission (a target, not a promise). */
export const targetProcessingMinutes = 30;

/**
 * Console account country the customer picks (where their PlayStation or Xbox account is registered).
 * Generated from ISO 3166-1 English names (Intl.DisplayNames), sorted, plus "Another country or region".
 * Ids are stored on orders: never rename one ("uk" is the United Kingdom; "us", "uk", "other" predate
 * this list, and older orders may also hold "eu"). Compatibility stays unconfirmed until codes are sourced.
 */
export const accountRegions = [
  { id: "af", label: "Afghanistan" },
  { id: "ax", label: "Åland Islands" },
  { id: "al", label: "Albania" },
  { id: "dz", label: "Algeria" },
  { id: "as", label: "American Samoa" },
  { id: "ad", label: "Andorra" },
  { id: "ao", label: "Angola" },
  { id: "ai", label: "Anguilla" },
  { id: "ag", label: "Antigua and Barbuda" },
  { id: "ar", label: "Argentina" },
  { id: "am", label: "Armenia" },
  { id: "aw", label: "Aruba" },
  { id: "au", label: "Australia" },
  { id: "at", label: "Austria" },
  { id: "az", label: "Azerbaijan" },
  { id: "bs", label: "Bahamas" },
  { id: "bh", label: "Bahrain" },
  { id: "bd", label: "Bangladesh" },
  { id: "bb", label: "Barbados" },
  { id: "by", label: "Belarus" },
  { id: "be", label: "Belgium" },
  { id: "bz", label: "Belize" },
  { id: "bj", label: "Benin" },
  { id: "bm", label: "Bermuda" },
  { id: "bt", label: "Bhutan" },
  { id: "bo", label: "Bolivia" },
  { id: "ba", label: "Bosnia and Herzegovina" },
  { id: "bw", label: "Botswana" },
  { id: "br", label: "Brazil" },
  { id: "io", label: "British Indian Ocean Territory" },
  { id: "vg", label: "British Virgin Islands" },
  { id: "bn", label: "Brunei" },
  { id: "bg", label: "Bulgaria" },
  { id: "bf", label: "Burkina Faso" },
  { id: "bi", label: "Burundi" },
  { id: "kh", label: "Cambodia" },
  { id: "cm", label: "Cameroon" },
  { id: "ca", label: "Canada" },
  { id: "cv", label: "Cape Verde" },
  { id: "bq", label: "Caribbean Netherlands" },
  { id: "ky", label: "Cayman Islands" },
  { id: "cf", label: "Central African Republic" },
  { id: "td", label: "Chad" },
  { id: "cl", label: "Chile" },
  { id: "cn", label: "China" },
  { id: "cx", label: "Christmas Island" },
  { id: "cc", label: "Cocos (Keeling) Islands" },
  { id: "co", label: "Colombia" },
  { id: "km", label: "Comoros" },
  { id: "ck", label: "Cook Islands" },
  { id: "cr", label: "Costa Rica" },
  { id: "ci", label: "Côte d'Ivoire" },
  { id: "hr", label: "Croatia" },
  { id: "cu", label: "Cuba" },
  { id: "cw", label: "Curaçao" },
  { id: "cy", label: "Cyprus" },
  { id: "cz", label: "Czechia" },
  { id: "dk", label: "Denmark" },
  { id: "dj", label: "Djibouti" },
  { id: "dm", label: "Dominica" },
  { id: "do", label: "Dominican Republic" },
  { id: "cd", label: "DR Congo" },
  { id: "ec", label: "Ecuador" },
  { id: "eg", label: "Egypt" },
  { id: "sv", label: "El Salvador" },
  { id: "gq", label: "Equatorial Guinea" },
  { id: "er", label: "Eritrea" },
  { id: "ee", label: "Estonia" },
  { id: "sz", label: "Eswatini" },
  { id: "et", label: "Ethiopia" },
  { id: "fk", label: "Falkland Islands" },
  { id: "fo", label: "Faroe Islands" },
  { id: "fj", label: "Fiji" },
  { id: "fi", label: "Finland" },
  { id: "fr", label: "France" },
  { id: "gf", label: "French Guiana" },
  { id: "pf", label: "French Polynesia" },
  { id: "ga", label: "Gabon" },
  { id: "gm", label: "Gambia" },
  { id: "ge", label: "Georgia" },
  { id: "de", label: "Germany" },
  { id: "gh", label: "Ghana" },
  { id: "gi", label: "Gibraltar" },
  { id: "gr", label: "Greece" },
  { id: "gl", label: "Greenland" },
  { id: "gd", label: "Grenada" },
  { id: "gp", label: "Guadeloupe" },
  { id: "gu", label: "Guam" },
  { id: "gt", label: "Guatemala" },
  { id: "gg", label: "Guernsey" },
  { id: "gn", label: "Guinea" },
  { id: "gw", label: "Guinea-Bissau" },
  { id: "gy", label: "Guyana" },
  { id: "ht", label: "Haiti" },
  { id: "hn", label: "Honduras" },
  { id: "hk", label: "Hong Kong" },
  { id: "hu", label: "Hungary" },
  { id: "is", label: "Iceland" },
  { id: "in", label: "India" },
  { id: "id", label: "Indonesia" },
  { id: "ir", label: "Iran" },
  { id: "iq", label: "Iraq" },
  { id: "ie", label: "Ireland" },
  { id: "im", label: "Isle of Man" },
  { id: "il", label: "Israel" },
  { id: "it", label: "Italy" },
  { id: "jm", label: "Jamaica" },
  { id: "jp", label: "Japan" },
  { id: "je", label: "Jersey" },
  { id: "jo", label: "Jordan" },
  { id: "kz", label: "Kazakhstan" },
  { id: "ke", label: "Kenya" },
  { id: "ki", label: "Kiribati" },
  { id: "xk", label: "Kosovo" },
  { id: "kw", label: "Kuwait" },
  { id: "kg", label: "Kyrgyzstan" },
  { id: "la", label: "Laos" },
  { id: "lv", label: "Latvia" },
  { id: "lb", label: "Lebanon" },
  { id: "ls", label: "Lesotho" },
  { id: "lr", label: "Liberia" },
  { id: "ly", label: "Libya" },
  { id: "li", label: "Liechtenstein" },
  { id: "lt", label: "Lithuania" },
  { id: "lu", label: "Luxembourg" },
  { id: "mo", label: "Macao" },
  { id: "mg", label: "Madagascar" },
  { id: "mw", label: "Malawi" },
  { id: "my", label: "Malaysia" },
  { id: "mv", label: "Maldives" },
  { id: "ml", label: "Mali" },
  { id: "mt", label: "Malta" },
  { id: "mh", label: "Marshall Islands" },
  { id: "mq", label: "Martinique" },
  { id: "mr", label: "Mauritania" },
  { id: "mu", label: "Mauritius" },
  { id: "yt", label: "Mayotte" },
  { id: "mx", label: "Mexico" },
  { id: "fm", label: "Micronesia" },
  { id: "md", label: "Moldova" },
  { id: "mc", label: "Monaco" },
  { id: "mn", label: "Mongolia" },
  { id: "me", label: "Montenegro" },
  { id: "ms", label: "Montserrat" },
  { id: "ma", label: "Morocco" },
  { id: "mz", label: "Mozambique" },
  { id: "mm", label: "Myanmar" },
  { id: "na", label: "Namibia" },
  { id: "nr", label: "Nauru" },
  { id: "np", label: "Nepal" },
  { id: "nl", label: "Netherlands" },
  { id: "nc", label: "New Caledonia" },
  { id: "nz", label: "New Zealand" },
  { id: "ni", label: "Nicaragua" },
  { id: "ne", label: "Niger" },
  { id: "ng", label: "Nigeria" },
  { id: "nu", label: "Niue" },
  { id: "nf", label: "Norfolk Island" },
  { id: "kp", label: "North Korea" },
  { id: "mk", label: "North Macedonia" },
  { id: "mp", label: "Northern Mariana Islands" },
  { id: "no", label: "Norway" },
  { id: "om", label: "Oman" },
  { id: "pk", label: "Pakistan" },
  { id: "pw", label: "Palau" },
  { id: "ps", label: "Palestine" },
  { id: "pa", label: "Panama" },
  { id: "pg", label: "Papua New Guinea" },
  { id: "py", label: "Paraguay" },
  { id: "pe", label: "Peru" },
  { id: "ph", label: "Philippines" },
  { id: "pn", label: "Pitcairn Islands" },
  { id: "pl", label: "Poland" },
  { id: "pt", label: "Portugal" },
  { id: "pr", label: "Puerto Rico" },
  { id: "qa", label: "Qatar" },
  { id: "cg", label: "Republic of the Congo" },
  { id: "re", label: "Réunion" },
  { id: "ro", label: "Romania" },
  { id: "ru", label: "Russia" },
  { id: "rw", label: "Rwanda" },
  { id: "bl", label: "Saint Barthélemy" },
  { id: "sh", label: "Saint Helena" },
  { id: "kn", label: "Saint Kitts and Nevis" },
  { id: "lc", label: "Saint Lucia" },
  { id: "mf", label: "Saint Martin" },
  { id: "pm", label: "Saint Pierre and Miquelon" },
  { id: "vc", label: "Saint Vincent and Grenadines" },
  { id: "ws", label: "Samoa" },
  { id: "sm", label: "San Marino" },
  { id: "st", label: "São Tomé and Príncipe" },
  { id: "sa", label: "Saudi Arabia" },
  { id: "sn", label: "Senegal" },
  { id: "rs", label: "Serbia" },
  { id: "sc", label: "Seychelles" },
  { id: "sl", label: "Sierra Leone" },
  { id: "sg", label: "Singapore" },
  { id: "sx", label: "Sint Maarten" },
  { id: "sk", label: "Slovakia" },
  { id: "si", label: "Slovenia" },
  { id: "sb", label: "Solomon Islands" },
  { id: "so", label: "Somalia" },
  { id: "za", label: "South Africa" },
  { id: "kr", label: "South Korea" },
  { id: "ss", label: "South Sudan" },
  { id: "es", label: "Spain" },
  { id: "lk", label: "Sri Lanka" },
  { id: "sd", label: "Sudan" },
  { id: "sr", label: "Suriname" },
  { id: "sj", label: "Svalbard and Jan Mayen" },
  { id: "se", label: "Sweden" },
  { id: "ch", label: "Switzerland" },
  { id: "sy", label: "Syria" },
  { id: "tw", label: "Taiwan" },
  { id: "tj", label: "Tajikistan" },
  { id: "tz", label: "Tanzania" },
  { id: "th", label: "Thailand" },
  { id: "tl", label: "Timor-Leste" },
  { id: "tg", label: "Togo" },
  { id: "tk", label: "Tokelau" },
  { id: "to", label: "Tonga" },
  { id: "tt", label: "Trinidad and Tobago" },
  { id: "tn", label: "Tunisia" },
  { id: "tr", label: "Türkiye" },
  { id: "tm", label: "Turkmenistan" },
  { id: "tc", label: "Turks and Caicos Islands" },
  { id: "tv", label: "Tuvalu" },
  { id: "vi", label: "U.S. Virgin Islands" },
  { id: "ug", label: "Uganda" },
  { id: "ua", label: "Ukraine" },
  { id: "ae", label: "United Arab Emirates" },
  { id: "uk", label: "United Kingdom" },
  { id: "us", label: "United States" },
  { id: "uy", label: "Uruguay" },
  { id: "uz", label: "Uzbekistan" },
  { id: "vu", label: "Vanuatu" },
  { id: "va", label: "Vatican City" },
  { id: "ve", label: "Venezuela" },
  { id: "vn", label: "Vietnam" },
  { id: "wf", label: "Wallis and Futuna" },
  { id: "eh", label: "Western Sahara" },
  { id: "ye", label: "Yemen" },
  { id: "zm", label: "Zambia" },
  { id: "zw", label: "Zimbabwe" },
  { id: "other", label: "Another country or region" },
] as const;
export const regionCompatibilityConfirmed = false;
