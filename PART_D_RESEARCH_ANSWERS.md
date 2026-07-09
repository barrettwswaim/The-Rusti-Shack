# Part D Research Answers — "Ask the Data" AI Assistant

A note before I start: this covers the research areas I actually worked through while building this feature — provider/model choice, the tool-calling architecture, cost/rate limits, and data privacy policy. If the original assignment had specific sub-questions phrased differently than what's below, tell me and I'll fill in the gaps — I want this document to actually answer what was asked, not just what I happened to research.

Everything below is written honestly: where I'm confident and why, and where something genuinely needs your own verification (with exactly what to check and where).

---

## Section 1: Choosing an AI Provider and Model

**Why Gemini, and why the `@google/genai` SDK.** The assignment specified Gemini, so I didn't need to run a bake-off against Claude or OpenAI here — but it's worth saying why that's a reasonable choice independent of the assignment: Gemini has a genuine free tier (useful for a small shop that doesn't want a recurring bill just to try this out), first-class function/tool calling, and an official, actively maintained JavaScript SDK. I checked the npm registry directly (not just assuming a version number) and confirmed `@google/genai` is a real, current package — version 2.10.0 as of this build, Apache-2.0 licensed. I did not hand-roll a fetch() wrapper around Gemini's REST API; using the official SDK means Google's own team handles request formatting, retries at the transport level, and SDK-side handling of "thought signatures" (an internal mechanism Gemini 3 models use to keep reasoning context across a multi-turn tool-calling conversation) — that last part in particular would be easy to get subtly wrong hand-rolling it myself.

**Which model(s) I picked, and why.** I checked Google's live models page (`ai.google.dev/gemini-api/docs/models`) rather than trusting my training data on model names, because Gemini's lineup changes fast and a wrong model ID string would just silently fail. As of this build (checked 2026-07-09), the current Gemini 3 series has two **stable** (not preview) models that fit this use case:

| Model | Role in this project | Input $/1M tokens | Output $/1M tokens |
|---|---|---|---|
| `gemini-3.1-flash-lite` | Default — fastest, cheapest, still "frontier-class" per Google's own description | $0.25 | $1.50 |
| `gemini-3.5-flash` | Optional, user-selectable — "most intelligent" of the two, for harder questions | $1.50 | $9.00 |

I deliberately did **not** wire in any *preview* model (like `gemini-3-flash-preview` or `gemini-3.1-pro-preview`), even though they showed up in the same docs page and are sometimes cheaper or more capable on paper. Google's own docs say preview models "will be deprecated with at least 2 weeks notice" — that's a fine tradeoff for an experiment, but not for a tool a shop owner might open every morning. A model ID that stops resolving would just break the feature with no warning. Stable models are the honest choice here even though it's a slightly more conservative one.

**What still needs your own check:** model lineups change. If you're reading this more than a few months after 2026-07, it's worth glancing at `ai.google.dev/gemini-api/docs/models` before assuming these two model IDs are still current/stable — Google does eventually retire even stable models (the page already lists several "Shut down" models from the same series that were current a year prior).

**Sources:**
- [Models | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/models)
- [Pricing | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/pricing)
- npm registry (`npm view @google/genai`), checked directly against the live registry, not assumed

---

## Section 2: Architecture — Why Tool/Function Calling Instead of "Just Ask the Model"

**The core problem this had to solve.** A general-purpose chat model asked "what were my top-selling products last year?" will happily produce a plausible-sounding, completely made-up answer if it isn't given a way to look up the real number. For a business tool, a confident wrong answer is worse than no answer. Function calling (also called "tool calling") is Gemini's mechanism for solving exactly this: instead of letting the model answer from its own training data, you give it a fixed list of named functions it's *allowed* to call, each with a JSON-schema description of its inputs, and the model's job becomes "figure out which function(s) answer this question, and with what arguments" — never "invent the number yourself."

**How I scoped it down further than a typical tool-calling setup.** A naive implementation would let the model call any of your app's internal functions, or worse, write its own SQL. I built this the opposite way: `lib/aiTools.js` defines exactly 8 tools (`getRevenueTrend`, `getProductProfitability`, `getSalesVsRentals`, `getCustomerSegments`, `getBasketAnalysis`, `getSeasonComparison`, `getInventorySummary`, `getForecastSummary`), each one a thin, validated wrapper around a single, already-existing, already-aggregated Postgres function. The model never sees a table name, a column name, or anything resembling SQL — it only ever sees 8 English descriptions and a handful of typed parameters (a year, a limit capped at 15, etc.), and every one of those parameters gets re-validated and clamped in JavaScript before it's ever passed to the database, even though the database layer itself is already parameterized and injection-safe. This was a deliberate "belt and suspenders" choice: the tool schema alone should already make it structurally impossible for the model to ask for anything outside the 8 functions, but validating again on the server means a bug in my schema definitions can't become a security hole.

**The harder problem: charts.** The assignment required the app to render charts, not the model — Gemini can't draw a chart, but a naive integration might ask the model to describe *what should go in the chart* (labels, values), and then trust those values. That's the same "model invents the number" problem, just moved one layer over. I solved it with a `renderChart` tool that takes only a reference to a *prior tool call already made this turn* (by index) and a shape (bar/pie/line/numberCards) — never the numbers themselves. The server (`lib/aiCharts.js`) looks up its own memory of that earlier tool result and builds the actual chart data from it. This means it is structurally impossible for a chart on this dashboard to show a number the model made up, because the code path that builds a chart never reads a number out of anything the model wrote — only out of a Postgres query result the server already has sitting in memory from a few seconds earlier in the same request.

**A genuine tradeoff I made, honestly stated:** capping every list-shaped tool result (and every chart) at 15 items is a real limitation — if the shop eventually stocks 40 product families, "top 15 by revenue" hides the tail. I chose 15 to match the existing dashboard's own chart conventions and to keep a single tool call cheap (fewer tokens = lower cost per question), but this is a judgment call, not a law of nature, and it's an easy constant to change later if it stops being the right tradeoff.

**Sources:**
- [Function calling with the Gemini API (generateContent / legacy) | Google AI for Developers](https://ai.google.dev/gemini-api/docs/generate-content/function-calling)
- [Function calling with the Gemini API (Interactions API) | Google AI for Developers](https://ai.google.dev/gemini-api/docs/function-calling) — I read this version too and deliberately chose *not* to use the newer Interactions API for this feature; see the note below.

**One decision worth flagging rather than hiding:** while researching this, I found Google now also offers a newer "Interactions API" (`client.interactions.create(...)`), which their docs describe as the currently recommended entry point for new integrations. I chose the older `generateContent` API instead, for a concrete reason: it's simpler to run as a fully stateless request/response loop (which is what a serverless API route needs), and I was able to verify its exact request/response shapes (the `functionCalls` array, the `usageMetadata` token counts I need for the cost display, the exact `functionResponse` structure) directly against Google's own current documentation. I did not find equivalent verified detail for the Interactions API's token-usage reporting in the time I had, and I was not willing to guess at that shape for a feature that reports real dollar estimates to a shop owner. This is a place where a future revisit might be worthwhile once the Interactions API's docs (and my familiarity with it) are more complete — but I'd rather ship something I verified than something newer I didn't.

---

## Section 3: Cost, Rate Limits, and Usage Tiers

**Pricing (paid tier), verified directly against `ai.google.dev/gemini-api/docs/pricing` on 2026-07-09:**

| Model | Input | Output |
|---|---|---|
| `gemini-3.1-flash-lite` | $0.25 / 1M tokens | $1.50 / 1M tokens |
| `gemini-3.5-flash` | $1.50 / 1M tokens | $9.00 / 1M tokens |

For scale: a typical question in this assistant — system instructions plus a short question plus one or two tool round-trips — runs somewhere in the range of a few hundred to a couple thousand tokens total. At `gemini-3.1-flash-lite` pricing, that's a fraction of a cent per question. I did not round this up into a marketing-style "less than a penny!" claim in the app itself — the UI shows the actual computed estimate per question, because real numbers age better than rounded ones.

**Usage tiers (how billing eligibility escalates), per Google's own rate-limits documentation:**

| Tier | How you get there | Spend-based rate cap |
|---|---|---|
| Free | No billing account linked | N/A — can't overspend without billing enabled |
| Tier 1 | Billing account linked | $10 per 10 minutes, up to a $250 cap |
| Tier 2 | $100+ spent, 3+ days since first payment | $200 per 10 minutes, up to a $2,000 cap |
| Tier 3 | $1,000+ spent, 30+ days since first payment | $200 per 10 minutes, $20K–$100K+ cap |

**What I could verify, and what I genuinely couldn't.** The pricing table above and the tier-escalation rules are published as static facts on Google's docs pages, so I'm confident in them as of the date I checked. The **specific free-tier requests-per-minute and requests-per-day numbers**, on the other hand, are explicitly *not* published as a fixed table anymore — Google's rate-limits page describes them as personalized to your account and visible only in your own Google AI Studio dashboard. I want to be direct about this rather than inventing a plausible-sounding number: **you'll need to check your actual free-tier limits yourself, in AI Studio, under your API key's usage/limits view**, before relying on this running unattended for a full day of questions. This is exactly the kind of fact I was told not to invent, and I'm not going to.

**What the app actually does about this, regardless of what the exact number turns out to be:** it never retries automatically against a rate-limited response. If Gemini returns a quota error (`RESOURCE_EXHAUSTED` / HTTP 429), the assistant shows a plain message telling you to wait a few minutes and try again — it doesn't hammer the API hoping it clears up, which would only make a rate-limit situation worse. Separately, there's also a project-side limit (20 questions per hour per IP address, enforced by this app's own database, independent of whatever Gemini's actual limit is) — that one exists to catch a bug or an accidental testing loop on my end, not to model Google's limits.

**Sources:**
- [Pricing | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/pricing)
- [Rate limits | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Billing info | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/billing)

---

## Section 4: Data Privacy and Training-Data Policy

This is the section I was most careful to get exactly right, because getting it wrong in either direction — overstating privacy protection, or underselling it — would be a real problem for a tool that touches a real business's data, even aggregated data.

**The free tier and the paid tier have genuinely different policies, and this matters.** Per Google's own published policy: on the **free tier**, content you send may be used by Google to improve their products (this is the same tradeoff most "free" AI tiers make across the industry — the product is partly paid for by contributing to training). On the **paid tier**, content is explicitly *not* used to train Google's models. This isn't a subtle difference in wording — it's a different contractual promise, and it's the single most important reason I'd recommend eventually moving this off the free tier if the shop owner starts relying on it regularly, even though the free tier is genuinely fine for a business already being careful (which this one is, structurally — see Section 5 of `AI_MANAGEMENT_SECURITY.md`) about never sending customer PII to the model in the first place.

**Why the PII question matters less than it would for a typical AI integration, but isn't zero.** Because this assistant's tools only ever return already-aggregated data (sums, counts, group-bys — see `lib/aiTools.js`), no customer name, email, phone number, or address is ever part of what gets sent to Gemini, on either tier. That's a structural fact about this codebase, not a promise about Google's training policy. So the free-tier-training question mostly affects *aggregate business figures* (revenue numbers, product names, category breakdowns) rather than anyone's personal information — a meaningfully smaller exposure, but not literally nothing, since "how much revenue The Rusti Shack made in Q2" is still non-public business information the owner might reasonably not want folded into a third party's training data.

**My honest recommendation, not a confident claim dressed up as one:** start on the free tier to test the feature (which is what this build currently uses), then link a billing account and move to the paid tier once you're comfortable with it, specifically to get the "not used for training" guarantee on your real business figures. This is a judgment call about risk tolerance, not something I can make for you — I'm flagging the tradeoff, not deciding it.

**What I could not verify and want to be upfront about:** I read Google's policy pages directly rather than relying on memory, but AI provider data-policy pages do change, and I'm not able to independently confirm enforcement (i.e., that Google's internal practice actually matches what the policy page says) — no outside party can, really, short of an audit. What I can vouch for is that I quoted the policy as published, didn't round it into something friendlier or scarier than what it says, and didn't invent language Google hasn't actually published.

**Sources:**
- [Billing info | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/billing) (free vs. paid tier data-use distinction)
- [Data logging and sharing | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/logs-policy)
- `AI_MANAGEMENT_SECURITY.md` (this project's own de-identification guarantees, which are independent of and in addition to whatever Google's policy says)

---

## Summary of Things That Need Your Own Verification (collected in one place)

1. **Exact free-tier requests-per-minute/day for your account** — check your own Google AI Studio dashboard; Google no longer publishes this as a static number.
2. **Whether `gemini-3.1-flash-lite` and `gemini-3.5-flash` are still current/stable models** if you're reading this well after 2026-07 — check `ai.google.dev/gemini-api/docs/models`.
3. **Your own risk-tolerance decision on free vs. paid tier** for the training-data policy tradeoff described in Section 4 — I've laid out the facts, but this is your call as the business owner, not a technical fact I can resolve for you.
4. **Actual dollar costs**, once you're using this for real — the in-app estimate is computed from real token counts and published rates, but your Google AI Studio / Cloud billing dashboard is the source of truth, not this app's estimate.
