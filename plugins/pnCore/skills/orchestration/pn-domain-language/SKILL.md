---
name: pn-domain-language
description: "Extract a DDD-style ubiquitous language glossary from the current conversation — flag ambiguities, propose canonical terms, save to UBIQUITOUS_LANGUAGE.md. Use when defining domain terms, building a glossary, hardening terminology, or when \"domain model\" or \"DDD\" is mentioned."
---

# Domain language

## When to use

- When domain terms are being used inconsistently in a conversation or codebase
- When starting a complex domain model and want shared vocabulary
- When the user asks "let's define our terms" or mentions DDD, ubiquitous language, or domain model
- When onboarding to a codebase with domain-specific vocabulary

## Workflow

### 1. Scan for domain terms

Read the current conversation (and relevant codebase files if available) for:
- Domain-relevant nouns (entities, value objects, aggregates, events)
- Domain-relevant verbs (operations, transitions, commands)
- Concepts that appear under multiple names
- Terms that seem overloaded or ambiguous

### 2. Identify problems

- **Same word, different concepts:** "account" used for both a billing entity and a user authentication identity
- **Different words, same concept:** "purchase", "order", "transaction" all meaning the same thing
- **Vague or overloaded terms:** "process", "handle", "manage" — too generic to be meaningful
- **Implicit concepts:** things that are real in the domain but have no agreed-upon name

### 3. Propose a canonical glossary

Be opinionated. When multiple words exist for the same concept, pick the best one and mark the others as aliases to avoid.

Group terms into clusters when natural categories emerge (by lifecycle, actor, subdomain). If all terms belong to one cohesive domain, one table is fine.

### 4. Write to `UBIQUITOUS_LANGUAGE.md`

Create or update the file in the workspace root:

```markdown
# Ubiquitous Language

## [Domain cluster name]

| Term | Definition | Aliases to avoid |
| ---- | ---------- | ---------------- |
| **[Term]** | [One sentence: what it IS, not what it does] | [synonym1, synonym2] |

## Relationships

- A **[Term]** belongs to exactly one **[Other Term]**
- An **[Term]** produces one or more **[Other Term]**

## Example dialogue

> **Dev:** "[Question using domain terms precisely]"
> **Domain expert:** "[Answer using terms precisely]"
> [3–5 exchanges that demonstrate how terms interact and clarify boundaries]

## Flagged ambiguities

- "[term]" was used to mean both **[Term A]** and **[Term B]** — these are distinct: [brief distinction]. Use **[Term A]** for [context], **[Term B]** for [context].
```

### 5. Output inline summary

After writing the file, summarize in chat:
- How many terms extracted
- Key ambiguities resolved
- Any terms that need domain expert input to resolve

## Re-running

When invoked again in the same conversation or project:
1. Read existing `UBIQUITOUS_LANGUAGE.md`
2. Incorporate new terms from subsequent discussion
3. Update definitions if understanding has evolved
4. Re-flag any new ambiguities
5. Rewrite the example dialogue to incorporate new terms

## Rules

- **Be opinionated.** Pick the best term; don't hedge with "this could be called X or Y."
- **Flag conflicts explicitly.** Call out ambiguous terms in "Flagged ambiguities" with a clear recommendation.
- **Only domain terms.** Skip generic programming concepts (array, function, endpoint) unless they carry specific domain meaning.
- **Tight definitions.** One sentence max. Define what it IS. Not what it does.
- **Show relationships.** Use bold term names and state cardinality where obvious.
- **Write an example dialogue.** 3–5 exchanges between a dev and domain expert demonstrating precise term usage.
