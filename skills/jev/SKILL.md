---
name: jev-decisions
description: Use the installed Jev Decisions MCP plugin for typed qualitative classification, ordinal scoring, and yes/no judgments over non-sensitive supplied text.
---
# Jev decisions
Use jev_decide when a concrete decision rubric benefits from a structured probability distribution: routing, relevance screening, qualitative risk triage, rubric scoring. Honor explicit user invocation. For automatic selection, call only when this specialist judgment adds value; do not call for every message.

Do not call for facts that require research, arithmetic, simulation, medical/legal/financial determinations, credentials, TSA-controlled material, or other sensitive information. Do not treat the tool as an oracle or as independent evidence. Text is transmitted to TypeSafe and consumes the deployment owner's API allowance.

Create one shared state string and 1–10 independent questions keyed by stable identifiers. Do not chain an answer into another question in the same call.
- Choice: mutually exclusive named alternatives with clear descriptions. Preserve all probabilities, selected choice and confidence.
- Score: 2–10 ordered levels, lowest to highest. The numerical score is the expected zero-based level index, not a percentage or probability of an event. Report the legend and distribution.
- Noul: a clearly worded true/false proposition. noul is the model's yes-likelihood, not severity or intensity; there is no confidence field.

Confidence is derived from the distribution, not validated correctness. Describe uncertainty plainly. Do not silently convert judgments into Monte Carlo frequencies. Use separately justified event frequencies and impact distributions for simulation; keep assumptions and provenance visible.

Use jev_status to diagnose configuration without calling the vendor. Never ask for or repeat a key. Authentication/configuration failures require the owner to fix Sites Settings. No automatic retries of inference after timeouts or ambiguous errors: the provider may already have charged for the request. Ask or explain before retrying.

The companion skill is reusable guidance, not an automatically installed ChatGPT system instruction. Tool descriptions remain sufficient for ordinary ChatGPT use. Users may copy this guidance into their supported custom instructions/project instructions or skill-capable client.
