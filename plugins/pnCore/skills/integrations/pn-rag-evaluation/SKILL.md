---
name: pn-rag-evaluation
description: Evaluate retrieval-augmented generation pipelines — golden sets, automated metrics (incl. RAGAS-style), human rubrics, regression gates in CI. Use when building or changing RAG (chunks, embeddings, rerankers, prompts) and need quality proof, not vibes.
---

# RAG evaluation

## When to use

- Adding or changing chunking, embeddings, rerankers, or retrieval top-k
- Before promoting a RAG release to production or a large user cohort
- After incidents: hallucinated citations, wrong doc retrieved, "empty" answers
- Setting up CI so RAG changes cannot silently degrade quality

## When not to use

- Pure generative Q&A with no retrieval (use normal eval harnesses)
- Full search-engine relevance tuning without generation (IR metrics only)

## Evaluation layers (run all three for production-grade)

| Layer | Purpose | Owner |
|-------|---------|-------|
| **Golden set** | Fixed questions + expected behavior | Engineering |
| **Automated metrics** | Scalable regression signal | CI + notebooks |
| **Human rubric** | Catches what metrics miss | Product / SME spot checks |

## 1. Golden set

Build a **versioned** dataset (JSONL or table) with at least:

| Field | Content |
|--------|---------|
| `id` | Stable id |
| `question` | User query (realistic phrasing) |
| `gold_docs` or `gold_chunk_ids` | Doc ids or chunk ids that *should* be retrievable (when known) |
| `answer_policy` | `must_cite`, `refuse_if_missing`, or acceptable paraphrase notes |
| `must_not` | Forbidden claims or sources (optional) |

**Sizing:** Start 50–200 items covering head + long tail; expand per domain. Stratify: easy retrieval, multi-hop, ambiguous, adversarial (prompt injection in retrieved text).

**Regression rule:** New pipeline version must **meet or beat** baseline on the golden set (see §4).

## 2. Automated metrics

Use **framework-agnostic goals**; implement with [RAGAS](https://docs.ragas.io/), deepeval, custom LLM-judge, or classical IR where appropriate.

| Concern | What to measure | Notes |
|---------|-----------------|--------|
| **Faithfulness / groundedness** | Answer supported by retrieved context | Penalize facts not in context |
| **Answer relevance** | Answer addresses the question | Not just fluent |
| **Context precision** | Retrieved chunks are useful | Reduce noise |
| **Context recall** | Needed facts appear in retrieved set | Tune k, chunking, reranker |
| **Citation alignment** (if citations exposed) | Quoted spans exist in cited chunks | Prevents fake cites |

**Goodhart warning:** Optimizing one metric collapses others. Track **small bundles** (e.g. faithfulness + context recall) and require **human** spot checks on outliers.

**CI pattern:** Run metrics on golden set nightly or on PR when RAG config changes; fail if below threshold or if delta vs `main` exceeds agreed slack.

## 3. Human evaluation

Automated metrics are **necessary, not sufficient**.

**Rubric (example — adjust per product):**

| Score | Faithfulness | Completeness | Usefulness | Safety |
|-------|--------------|--------------|------------|--------|
| 2 | Fully supported by cited context | Addresses all parts of question | Actionable, clear | No risky advice |
| 1 | Mostly supported; minor stretch | Partial | Needs follow-up | Minor issues |
| 0 | Unsupported or contradicted | Wrong or empty | Misleading | Harm or policy break |

- Sample **20–50** items per release wave (weighted toward failures from automation).
- Two raters on a subset for inter-rater sanity.

## 4. Regression gates

- Store **baseline scores** (`baseline-rag-eval.json` or vendor dashboard snapshot) pinned to commit or model id.
- **Block merge** when: faithfulness or citation accuracy drops beyond threshold, or human rubric shows new failure modes.
- Log **config fingerprint**: embedding model id, chunk size, overlap, reranker, top-k, prompt hash.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "We'll eyeball it in prod." | You will ship silent regressions; prod is not a lab. |
| "RAGAS score is enough." | Metrics game narrow distributions; humans catch brand and safety. |
| "Golden sets are expensive." | Smaller than incident cost; start at 50 items. |
| "Only retrieval changed; answers are fine." | Retrieval poison flows to generation and citations. |

## Red flags — stop

- No golden set exists but leadership wants "RAG in prod."
- Single LLM-judge grades everything with no human audit trail.
- Chunking or schema changes ship without re-running retrieval recall checks.

## Verification

- Golden file committed; last eval run linked (artifact path or CI run URL).
- Automated + human summary recorded for this release candidate.

## Guardrails

- Do not claim "RAGAS = ground truth"; it is one signal.
- For regulated or high-stakes advice, escalate review policy with **pn-agent-governance**.
- **pn-source-driven-implementation** applies to framework-specific eval APIs (pin versions in lockfile).

## Integration

- **pn-cx-agent-patterns** — RAG in CX agents; run this skill before scaling traffic.
- **pn-prompt-optimize** — Eval prompts and refusal behavior alongside retrieval.
- **pn-budget-cost-monitor** / **pn-context-engineering** — RAG increases tokens; budget retrieval + answer paths.
- **pn-security-audit** — Retrieved doc injection, unsafe exfil via citations.
- **pn-evidence-qa** — For UIs that surface citations visually, cross-check displayed cites.

## Output

- Golden set schema proposal or diff
- Metric table (baseline vs candidate) + config fingerprint
- Human rubric sample results
- Ship / iterate / block recommendation with concrete failure clusters
