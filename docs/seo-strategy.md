# VICE STORE: SEO, AEO and organic growth strategy

Status: 21 November 2026. Grand Theft Auto VI launched on 19 November 2026 (PS5, Xbox Series X|S). The site is **not indexable yet**:

- `robots.txt` disallows everything.
- Every page carries `noindex`.
- The sitemap is empty.

The site stays that way until `NEXT_PUBLIC_INDEXABLE=true`, which should be set only after the launch blockers below are cleared.

> **Evidence rule.** This document has no search volumes, keyword difficulty scores or traffic forecasts. None were measured, and quoting third-party estimates as fact would be fabrication. Priorities are based on observed search results (SERPs), intent and how well we can satisfy the query truthfully. Measure real demand in Search Console and Google Trends after launch (see Monitoring).

## 1. What the research shows (November 2026)

- **Price and editions dominate.** Results are crowded with "price", "editions" and "Standard vs Ultimate" guides from large publishers (TechRadar, PC Gamer, VGC, Tom's Guide, IGN-tier sites) and many low-quality aggregators.
  - Official prices widely reported: Standard $79.99 / £69.99; Ultimate $99.99 / £89.99, digital only.
  - The Ultimate Edition Upgrade can be bought separately later.
  - The physical edition contains a download code; there is no disc.
- **Rising platform-specific questions.** Recent Digital Foundry coverage made Xbox Series S performance a live topic (about 720p internal resolution, frame drops). Region locking is a second live topic: PS5 download codes are reported region-locked, Xbox codes are not.
- **Bonus and timing questions.** The Vintage Vice City pack is reported for pre-orders and purchases before 20 November 2026, so questions about whether it can still be claimed are active.
- **Interest is mainstream and global.** Trends coverage shows GTA 6 interest beating broad topics, with spikes at trailer and launch moments. A rising-queries export was not available through search; pull it directly from trends.google.com (see Monitoring).

Sources (secondary unless stated; verify before publishing any fact):

- Edition contents and prices:
  - [VGC: Ultimate vs Standard](https://www.videogameschronicle.com/guide/gta-6-ultimate-edition-vs-standard-edition-all-ultimate-edition-pre-order-benefits/)
  - [PC Gamer: editions explained](https://pcgamer.com/games/grand-theft-auto/gta-6-pre-order-editions-standard-ultimate/)
  - [TechRadar](https://www.techradar.com/gaming/the-gta-6-editions-arent-what-we-expected-heres-whats-included-in-the-standard-and-ultimate)
  - [Tom's Guide](https://www.tomsguide.com/gaming/gta-6s-ultimate-edition-is-the-real-full-game-and-the-rumors-of-it-costing-usd100-were-true-after-all)
  - [GTABase editions guide](https://www.gtabase.com/articles/gta-6/gta-6-editions-guide-pre-order-bonus-special-editions-content)
  - [Just Jared price explainer (17 Nov 2026)](https://www.justjared.com/2026/11/17/gta-6-price-editions-standard-ultimate-preorder-bonuses/)
- Series S performance:
  - [VGC](https://www.videogameschronicle.com/news/gta-6-xbox-series-s-performance-analysis-admires-the-effort-but-says-significant-frame-drops-are-a-problem/)
  - [LevelUp](https://www.levelup.com/en/news/does-gta-6-run-well-on-xbox-series-s-experts-praise-rockstars-work-but-issue-an-important-warning-about-microsofts-console/)
  - [Games.gg analysis](https://games.gg/news/gta-6-console-performance-analysis/)
- Region locking:
  - [Notebookcheck](https://www.notebookcheck.net/Rockstar-confirms-GTA-6-PS5-codes-are-region-locked-Xbox-players-unaffected.1353053.0.html)
  - [Wccftech](https://wccftech.com/playstation-5-gta-6-download-codes-region-locked-xbox-no-restriction/)
  - [Insider Gaming](https://insider-gaming.com/gta-6-ps5-codes-are-region-locked-but-xbox-version-isnt/)
  - [Push Square](https://www.pushsquare.com/news/2026/07/gta-6-region-locks-raise-more-questions-about-psns-flaky-infrastructure)
- Search interest:
  - [Crypto Times on Trends](https://www.cryptotimes.io/2026/06/23/gta-6-beats-crypto-in-google-trends-what-is-happening-right-now/)
  - [iPhone in Canada](https://www.iphoneincanada.ca/2026/09/08/gta-vi-most-trending-game-search/)
  - [Google Trends](https://trends.google.com/trends/)
- Official sources to cite on the site: [rockstargames.com/VI](https://www.rockstargames.com/VI), the [PlayStation Store](https://store.playstation.com) and [Xbox Store](https://www.xbox.com) product pages, and [Rockstar Support](https://support.rockstargames.com).

## 2. Keyword clusters and priorities

Intent: T = transactional, C = commercial investigation, I = informational, N = navigational.

**Commerce gate:** P1 clusters target buying and must not carry buy/price claims in titles, ads or markup until real stock, rights and policies exist. Until then, target them with comparison and information content only.

| Cluster | Representative queries (seed + observed variants) | Intent | Priority | Why |
|---|---|---|---|---|
| Editions comparison | gta 6 standard vs ultimate, gta 6 editions, what's included in gta 6 ultimate edition, gta vi edition comparison, is gta 6 ultimate edition worth it, which gta 6 edition should i buy | C/I | **P1 now** | Our strongest truthful asset: a verified side-by-side comparison already on the page |
| Platform price | gta 6 price, gta 6 ps5 price, gta 6 xbox price, how much is gta 6, gta 6 ultimate edition price | C | P1 (at launch) | High intent. Must show real, current prices; ours must be explainable (see Blockers) |
| Platform compatibility | gta 6 ps5, gta 6 xbox series x, can i play gta 6 on xbox series s, gta 6 series s performance, which consoles support gta vi, gta 6 pc | I/C | **P1 now** | Rising (Series S analysis). Answerable precisely. "PC" queries must be answered honestly (no PC version announced) |
| Codes and redemption | gta 6 digital code, gta 6 code ps5, gta 6 code xbox, how to redeem gta 6 code, are gta 6 codes region locked, gta 6 code in box | I→T | P1 (after supply confirmed) | Matches the product we would sell. Region-lock facts are decisive for conversion and refunds |
| Buy (transactional) | buy gta 6, buy gta 6 ps5, buy gta 6 ultimate edition, where to buy gta 6 online, buy gta vi digital code | T | P2 (gated) | Dominated by Rockstar, PlayStation, Xbox and major retailers. Win long-tail variants only, with real stock |
| Crypto purchase | buy gta 6 with bitcoin, buy gta 6 with crypto, buy gta vi with usdt, gta 6 crypto | T | **P1 at launch** | Low competition and a genuine differentiator. Only rank with real fulfilment; avoid crypto-promotional ad copy |
| Bonuses and timing | gta 6 pre order bonus, vintage vice city pack, can i still get gta 6 bonus, gta+ free month | I | P3 | Facts change quickly. Publish only verified answers for *this* channel |
| Entities and world | jason and lucia, leonida map regions, vice city gta 6, gta 6 trailer | I/N | P3 | Context and engagement (Explore, Characters, Trailers). Not a commercial target |

**Voice and question queries (answer-first targets):**
- "how much does GTA 6 cost on PS5"
- "what's the difference between GTA 6 Standard and Ultimate"
- "can GTA 6 run on Xbox Series S"
- "are GTA 6 codes region locked"
- "how do I redeem a GTA 6 code"
- "can I buy GTA 6 with Bitcoin"

**Semantic entities to keep consistent:** Grand Theft Auto VI / GTA 6 / GTA VI, Rockstar Games (publisher, not us), Take-Two, PlayStation 5, Xbox Series X|S, Leonida, Vice City, Jason Duval, Lucia Caminos, Standard Edition, Ultimate Edition, Ultimate Edition Upgrade, code-in-box, PlayStation Network region, Microsoft Store, USDT (Tron/TRC20), Bitcoin.

## 3. Keyword-to-page mapping

| Page | Primary focus | Secondary | State |
|---|---|---|---|
| `/` (hero + `#editions`) | gta 6 editions / GTA VI Standard & Ultimate Editions (title) | gta 6 price ps5/xbox, buy gta 6 (gated) | Live (noindex until launch) |
| `/#compare` | gta 6 standard vs ultimate, what's included | ultimate edition worth it | Live, verified contents only |
| `/#faq` | question cluster (editions, platforms, code-in-box) | voice queries | 4 verified answers live; 9 drafts pending |
| `/#trailers` | gta 6 trailer | launch trailer | Live, VideoObject markup |
| `/about` | VICE STORE, independent GTA 6 retailer | trust and transparency | Draft (needs seller details) |
| `/contact` | gta 6 order help | code not working | Draft |
| `/refund-policy`, `/terms`, `/privacy`, `/cookies` | trust pages (not ranking targets) | | Drafts |
| **Opportunity:** `/guides/gta-6-editions` | which GTA 6 edition should I buy | worth it, upgrade later | Not built |
| **Opportunity:** `/guides/gta-6-codes-region-lock` | are gta 6 codes region locked, how to redeem | ps5 vs xbox codes | Not built: needs official source and our supply terms |
| **Opportunity:** `/guides/buy-gta-6-with-crypto` | buy gta 6 with bitcoin / usdt | how crypto checkout works | Not built: only after live checkout |
| **Opportunity:** `/guides/gta-6-xbox-series-s` | can i play gta 6 on series s | performance, which console | Not built: cite Digital Foundry and the platform pages |

**Guardrail:** at most these four guides, each substantial and original, with first-hand detail (our process, screenshots, redemption steps we have tested) and dated sources. No location, platform or keyword-variant page spam. Each guide links to `#editions`, and the home page links back to it.

## 4. What was implemented (GTA-BRAND-01 / GTA-11B)

- **Brand configuration:** `site.ts` (name, wordmark, tagline, title, URL from `NEXT_PUBLIC_SITE_URL`) feeds the metadata, Open Graph, sitemap, structured data, emails and admin.
- **Metadata:**
  - Default title: "GTA VI Standard & Ultimate Editions | VICE STORE".
  - Template: `%s | VICE STORE`.
  - Description under 160 characters. It is intent-aware: "Compare…" while checkout is closed, "Buy…" only when it is open.
  - Canonicals per page; transactional and admin pages are `noindex` with their own canonical.
- **Social:** a generated Open Graph and Twitter card (`opengraph-image.tsx`, brand fonts, no unlicensed art) and `icon.svg` / `apple-icon`.
- **Crawling:**
  - `robots.ts`: before launch, disallow everything. After launch, allow all except `/admin`, `/api/`, `/checkout` and `/order-status`, and point to the sitemap.
  - `sitemap.ts`: published pages only, after launch.
- **Verification:** the `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` environment variables become meta tags.
- **Structured data:** one `@graph`, gated on reality.
  - Always: WebSite; VideoGame (verified facts, alternate names GTA 6 / Grand Theft Auto 6); VideoObject × 4 (official trailers, upload date and duration from config); FAQPage (verified answers only).
  - Organization: only once the seller's legal name is set.
  - Product + Offer: only when checkout is open, the seller is confirmed, and the terms and refund pages are published.
  - Never: ratings or reviews.
  - Information pages: WebPage, AboutPage or ContactPage, plus BreadcrumbList.
- **On-page:**
  - The H1 now reads "Vice City. Your rules. Grand Theft Auto VI". Missing word boundaries had produced "City.Your"; character names had the same problem.
  - Semantic H2 and H3 outline verified; all images have alt text; no broken internal links.
- **Performance:** removed an SVG turbulence + displacement + blur filter from the drawn edition art. It re-rasterised on every selection change and was the main cause of slow interactions.

## 5. Technical audit (measured on a production build, live configuration)

Lighthouse is not installed (adding it would be a new dependency), so these are lab measurements from Chromium's performance APIs (`largest-contentful-paint`, `layout-shift` and `event` timing) on `next start`. They are not Lighthouse scores and not field data (CrUX).

| Metric | Target | Mobile (412px, 4× CPU, 10 Mbps) | Desktop |
|---|---|---|---|
| LCP | ≤ 2.5 s | 0.83–0.92 s | 0.46–0.47 s |
| CLS | ≤ 0.1 | 0.000 | 0.016–0.017 |
| Slowest interaction (INP proxy) | ≤ 200 ms | 232–248 ms (**not yet met**) | 88–112 ms |
| Page weight | | 634 KB | 666 KB |

Before the filter fix: LCP 0.86 s (mobile) and 0.49 s (desktop), but interactions reached 304–704 ms. Remaining mobile cost is presentation (repainting the large drawn edition art at high pixel density under 4× CPU). Next steps: avoid re-rendering unchanged artwork on platform changes, and lighten the art. Re-measure after every visual change, and confirm with PageSpeed Insights field data once the site has traffic.

**Other checks:**
- Status codes: unknown pages and unpublished pages return 404.
- Private pages:
  - `/checkout` and `/order-status`: `noindex`.
  - `/admin`: `noindex`, no canonical, and disallowed in robots.
- Duplicate URLs: there is a single host from `NEXT_PUBLIC_SITE_URL` with no trailing slash. Hash anchors are not separate URLs.
- Rendering: all content is server-rendered. Motion never hides content without JavaScript or under reduced motion.

## 6. AEO / GEO (AI Overviews, AI Mode, assistants)

- Answer-first FAQ: the question as the H3, a one- or two-sentence direct answer first, then detail. Only verified answers ship.
- Entity clarity: a consistent naming set (see §2); VideoGame, Product and Offer linked with `@id`; edition → contents → platform relationships stated in the comparison table.
- Citations: link the official sources (Rockstar, the PlayStation Store, the Xbox Store, Rockstar Support) next to the facts they support. Visible "last updated" dates on guides and policies.
- Trust signals AI systems and raters look for:
  - real seller identity and contact details;
  - clear refunds;
  - honest pricing;
  - no fake reviews;
  - a visible non-affiliation notice (present site-wide).
- Avoid: AI-generated filler pages, keyword-variant pages, hidden text, and FAQ markup for questions not shown on the page.

## 7. Launch blockers (Google Search, Ads, Merchant Center, AdSense)

1. **Pricing credibility.** The provisional prices ($19 / $39) are far below the official $79.99 / $99.99. Without documented authorised supply this looks like the "too good to be true" pattern behind Google Ads and Merchant Center *Misrepresentation* and *Unreliable claims* suspensions, and it erodes user trust. Set prices that reflect real, authorised supply, and be ready to show supplier documentation.
2. **Business identity.** Legal name, address and support contact are empty. These are required for Merchant Center, Ads verification, the legal pages and Organization markup.
3. **Domain and brand.** Use a domain without Rockstar or Take-Two marks (the proposed one contains "rockstar"). In ads, trademark use is generally permitted only for genuine resale of the product, so expect trademark reviews.
4. **Media.** Site images are served from `/media/` (sent to the server with the media package).
5. **Crypto payments.** Read the current Google Ads cryptocurrency and financial-products rules for the target countries before any ad mentions crypto payment. Selling a game for crypto is not a crypto product, but ad copy can trigger reviews.
6. **AdSense.** Ads require the published privacy and cookie policies (drafted), plus a Google-certified consent management platform for the EEA, UK and Switzerland before enabling them.

## 8. Monitoring (after `NEXT_PUBLIC_INDEXABLE=true`)

- **Search Console:**
  - Weekly: Queries and Pages reports (impressions, CTR, position), filtered for "gta 6", "gta vi", "edition", "price", "code", "crypto" and "series s".
  - Coverage and Enhancements: Video, FAQ validity and indexing errors.
- **Bing Webmaster Tools:** the same queries; submit the sitemap. Bing feeds several AI assistants.
- **Google Trends:**
  - Monthly: compare "gta 6 price", "gta 6 ultimate edition", "gta 6 code" and "gta 6 series s".
  - Export the Rising queries for the past 30 days into this document.
- **Core Web Vitals:**
  - PageSpeed Insights and CrUX field data once traffic qualifies.
  - Re-run the lab script after visual changes.
- **Rich results:** Google's Rich Results Test and the Schema.org validator on `/` after each structured-data change.
- **Content freshness:**
  - Review prices, editions and bonus facts against official sources at least weekly in launch season.
  - Update the `verified` flags and dates in config, never the copy alone.
