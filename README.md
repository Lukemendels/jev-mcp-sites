# Jev MCP for ChatGPT Sites
A lightweight, owner-private MCP integration for TypeSafe Jev Choice, Score and Noul. One call supports multiple independent typed questions. No Windows installation, Python orchestrator, or graphical app is needed.

## Status
Verified 2026-10-09: 38 mocked regression tests, production build, owner-private deployment, and a real authenticated batch through the installed plugin in Dot. Choice, Score, Noul and token usage returned successfully. Fresh ordinary ChatGPT explicit and natural-language tests were also corroborated by server request/quota telemetry, though the browser did not expose a visible tool trace. A separate second-user deployment remains unverified. See `docs/test-evidence.md` for scope and limitations.

## Deploy your own copy (ChatGPT Plus)
1. Clone or fork this repository. In ChatGPT with Sites available, ask it to build and deploy this repository as a NEW owner-private Site. The repository's `.openai/hosting.json` deliberately has no project identity; registration supplies your own. Preserve `mcp` capability and `DB` D1 binding. Do not reuse another person's Site ID, deployment, key, or access token.
2. Let the Sites workflow install dependencies (`npm ci`), generate/build the Worker, register the Site, push source, package and deploy privately. Migrations under `drizzle/` establish the quota table; never manually create it on requests.
3. In ChatGPT Sites, open the new Site's More actions → Settings. Add `JEV_API_KEY` as a server-side secret and save. Get your own API key through your TypeSafe account; never paste it into chat, GitHub, README, `.env.example`, frontend code or a tool argument. Redeploy after configuring hosted settings. Optional non-secret `JEV_MODEL` defaults to `jev-1.13.0`.
4. Install/connect the private plugin provisioned by Sites: Plugins → Personal → Created by you. Sites manages the OAuth connection. Do not create a separate local stdio MCP or separate app.
5. Explicitly select the plugin in a normal ChatGPT conversation and ask for `jev_status`, then a synthetic decision. Complete the checklist below. Plus eligibility is documented, but exact rollout/account availability must be checked in your account. TypeSafe usage and billing are separate from the ChatGPT subscription.

No source edits are needed for keys or model selection. No credentials ship in this repository. The private deployment remains accessible only to its owner; Paul deploys his own copy and uses his own key. Making this source public does not make the endpoint public.

Suggested deployment prompt:
> Deploy this repository as my new private ChatGPT Site with its MCP capability and D1 quota binding. Keep the API key in Sites server-side secrets. Preserve owner-only access and run the mock tests before publishing. Help me install its provisioned plugin, then verify a synthetic call after I configure my key.

## Local development
Node 22.13+; `npm ci`, `npm test`, `npm run build`. Tests use Node's built-in test runner and mocked upstream responses, and can run before dependencies install. `npm run db:generate` only when intentionally changing schema. Sites is the supported hosting boundary, not an arbitrary raw Node server.

## Tools
- `jev_decide({state,questions})`: 1–10 Choice/Score/Noul questions in ONE `POST https://api.typesafe.ai/v1/systemone` request. Only fixed upstream URL and Bearer server credential; callers cannot override URLs or headers.
- `jev_status({})`: configuration flag, model and limits. No vendor call, no secret value.

Example:
```json
{"state":"Synthetic supplier missed two milestones; no backup is documented.","questions":{"triage":{"type":"choice","instructions":"Choose concern level.","criteria":{"low":"Routine monitoring","high":"Mitigation review needed"}},"readiness":{"type":"score","instructions":"Rate readiness, lowest first.","criteria":["No backup","Partial backup","Tested backup"]},"review":{"type":"noul","instructions":"Is human mitigation review warranted?"}}}
```
Output preserves each answer's probability distribution, confidence when supplied by that primitive, and usage input/output tokens. Provider response fields are whitelisted and validated. Questions are independent on shared state; use a later request for dependent follow-on decisions.

Choice selects an alternative. Score is an expected zero-based level index, not a percentage. Noul is the model's yes-likelihood, not intensity. Confidence is distribution concentration, not verified correctness. No estimate is represented as a validated event frequency.

## Security and usage
- Sites owner-private access plus managed OAuth; data-bearing tool calls require the trusted `oai-authenticated-user-id` supplied by Sites. Discovery contains no private data. A service access token is not a signed-in user identity and is intentionally insufficient for inference.
- Do not run the Worker behind a proxy that trusts client-provided identity headers. The platform authentication boundary is part of the deployment contract.
- Durable atomic D1 limits: 10 inference requests/minute, 100/day and 500 questions/day, shared across the private deployment. UTC fixed windows; failed/ambiguous upstream requests consume reserved quota. Quota failure fails closed. No in-memory fallback.
- 64 KiB streamed request and 256 KiB upstream response limits; 24,000-character state, 10 questions, 20-second upstream deadline. These are wrapper defaults, not TypeSafe's advertised limits.
- No request-state, prompt, credential, or raw provider-error logging. No arbitrary outbound URL, no redirects, no automatic paid inference retries. Error messages are sanitized. No request content stored in D1, only counters.
- Personal experimentation only. Do not submit TSA-controlled or sensitive information.

## Companion skill and Paul example
`skills/jev/SKILL.md` teaches selection, interpretation and safe abstention. It is not automatically imported by ChatGPT when a plugin is installed; tool descriptions carry core guidance. Copy it into supported project/custom instructions or use it with a skill-capable client.

`node examples/paul-risk.mjs` prints a synthetic Jev qualitative-risk request and a separate, reproducible Monte Carlo simulation. The simulation uses explicit analyst assumptions (15% event frequency and uniform $1,000–$10,000 impact), never Jev's judgment probabilities. Replace those assumptions with defensible data before decision use. Jev can flag cases for review; the simulation quantifies consequences conditional on independently supplied inputs.

## Acceptance checklist
- [x] `npm test` and build pass; inspect documented evidence in `docs/test-evidence.md`.
- [x] Private Site deployment succeeds with D1 migration.
- [x] Anonymous external request cannot invoke inference; valid owner plugin can read status.
- [x] Owner sets secret in Settings and redeploys; `jev_status` reports configured.
- [x] Explicit installed-plugin invocation in Dot returns real Jev output for a synthetic batch, with token usage. Fresh ordinary ChatGPT explicit invocation was separately corroborated by server telemetry; see evidence limitations.
- [x] Fresh ordinary ChatGPT conversations: explicit tool request and natural-language assessment both produced expected results, corroborated by two server inference requests. No visible UI tool trace; per-flow mapping is inferred from timing. Selection remains model-dependent, not guaranteed by server code.
- [x] Ask Dot to use installed tool, recording success or unsupported status separately.
- [ ] Paul independently deploys, supplies his own key, connects and calls tool. Cloning source alone does not prove this.

## Official references (verified 2026-10-09)
- [TypeSafe API](https://docs.typesafe.ai/api), [Choice](https://docs.typesafe.ai/primitives/choice), [Score](https://docs.typesafe.ai/primitives/score), [Noul](https://docs.typesafe.ai/primitives/noul), [confidence](https://docs.typesafe.ai/confidence), [models](https://docs.typesafe.ai/models)
- [ChatGPT Sites](https://learn.chatgpt.com/docs/sites), [Plugins](https://learn.chatgpt.com/docs/plugins)
- [MCP 2025-06-18 HTTP transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)

MIT license. TypeSafe and ChatGPT are separate services with their own terms and availability.
