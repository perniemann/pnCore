---
name: pn-cultural-heritage-research
description: "Tiered research for art history, movements, museums, period-accurate visuals and copy. Uses institutions, open aggregators, Wikidata/AAT, then discovery UIs — no single-vendor dependency. Use before grounding UI, games, or content in cultural facts."
---

# Cultural heritage research

## When to use

- Art direction or mood boards tied to a **period, region, medium, or movement**.
- UI theming, typography, or palette that should align with a **named era** (not generic “vintage”).
- Game or 3D **visual language** that references real schools, artifacts, or exhibition narratives.
- Museum-style **editorial or education copy** where provenance and rights matter.
- Any task where you must separate **“inspired by”** from **claims of fact** (dates, attribution, holdings).

## Source ladder (apply in order; cite every factual layer)

| Tier | Use for | Examples |
|------|---------|----------|
| **T1 — Holding institution** | Object facts, exhibition text, **rights / reuse** | Official museum, national library, or archive collection pages |
| **T2 — Open aggregators** | Cross-collection metadata, stable record URIs | [Europeana APIs](https://apis.europeana.eu/en) (Search/Record); [CC0 metadata policy](https://pro.europeana.eu/page/linked-open-data). Regional national aggregators when the brief is geographically scoped. |
| **T2b — Structured data** | Disambiguation, influences, dates, synonyms | [Wikidata WikiProject Visual arts](https://www.wikidata.org/wiki/Wikidata:WikiProject_Visual_arts). Treat as **navigation and hypotheses**; confirm object-level facts on **T1** or authoritative **T2** records. |
| **T3 — Controlled vocabulary** | Consistent **terms** (materials, roles, styles) | Getty [Art & Architecture Thesaurus](https://www.getty.edu/research/tools/vocabularies/aat/) (AAT) — terminology, not provenance. |
| **T4 — Discovery / editorial UIs** | Browsing, stories, partner layouts | Branded portals (e.g. [Google Arts & Culture Explore](https://artsandculture.google.com/explore)) are **optional entry points only**; never the sole authority for facts or rights. |

## Instructions

1. **Scope:** Geography, time span, medium, movement, named artist/work, and whether the deliverable needs **legal reuse** (e.g. high-res assets) or only **conceptual** alignment.
2. **T1 first when known:** If the user names a museum or collection, open its **official** object or exhibition page before aggregators.
3. **Broad discovery:** Use WebSearch / WebFetch. Prefer **T2 record URLs** in the bibliography over anonymous blogs or uncited listicles.
4. **Disambiguate:** Use Wikidata or AAT to resolve duplicate names (schools, cities, homonymous artists). **Do not** treat Wikipedia/Wikidata alone as proof of museum holdings.
5. **Synthesize for implementation:** Map findings to **design tokens, adjectives, constraints, and prompt terms** — separate “source said X” from “we will implement Y.”
6. **Optional save:** For multi-step projects, save a short brief to `docs/research/YYYY-MM-DD-<slug>-heritage.md` using formats from **pn-documentation** (sources table, confidence labels).

## API note (optional)

- If an **Europeana API key** is available in the environment (e.g. `EUROPEANA_API_KEY`), prefer Search/Record API responses for **metadata** citations; include the Europeana **record URL** in the source list.
- Without a key, use public HTML pages and WebSearch; do not embed secrets in prompts or repo files.

## Guardrails

- **Do not invent** accession numbers, dates of acquisition, or rights terms.
- **Cite the rights statement** from the holding record when reuse matters; aggregators and portals **do not replace** the institution for disputes.
- Label **speculation** vs **verbatim or cited** claims.
- This skill does not assert universal “best practice” for UX; it enforces **source discipline** for cultural and historical claims.

## Integration

- **pn-frontend-design**, **pn-typography**, **pn-color-system** — Period-consistent UI choices after research.
- **pn-image-creator**, **pn-image-prompt-engineering** — Era-accurate prompts with explicit “inspired by / not a reproduction” boundaries.
- **pn-game-developer**, **pn-gamedev-philosophy** — Art direction and setting research.
- **pn-content-strategy**, **pn-copywriter** — Editorial tone vs factual exhibition copy.
- **pn-cultural-researcher** agent — Dedicated handoff when the user wants a full research pass before design or implementation.

## Output

- A **source list**: title, publishing institution or aggregator, URL, retrieval date, and what each source **actually states**.
- **Implementation notes**: safe paraphrase for UI/copy/prompts; explicit gaps where sources were silent.
- Optional **saved brief** path under `docs/research/` when the project tracks research artifacts.
