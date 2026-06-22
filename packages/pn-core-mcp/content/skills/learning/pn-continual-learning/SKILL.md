---
name: pn-continual-learning
description: Incrementally extract recurring user corrections and durable workspace facts from transcript changes, then update AGENTS.md with plain bullet points only. Use when the user asks to mine previous chats, maintain AGENTS.md memory, or build a self-learning preference loop.
---

# Continual Learning

Keep `AGENTS.md` current using transcript deltas instead of full rescans.

## When to use

- Updating AGENTS.md after sessions that contain new user corrections, preferences, or durable workspace facts.
- Mining past agent transcripts for recurring patterns to persist in memory.
- Running the self-learning loop manually when the stop hook did not trigger automatically.
- Keeping AGENTS.md deduplicated and fresh without a full rescan of all transcripts.

## Inputs

- Transcript root: `~/.cursor/projects/.../agent-transcripts/`
- Existing memory file: `AGENTS.md`
- Incremental index: `.cursor/hooks/state/continual-learning-index.json`

## Workflow

1. Read existing `AGENTS.md` first.
2. Load incremental index if present.
3. Discover transcript files and process only:
   - new files not in index, or
   - files whose mtime is newer than indexed mtime.
4. Extract only high-signal, reusable information:
   - recurring user corrections/preferences
   - durable workspace facts
5. Merge with existing bullets in `AGENTS.md`:
   - update matching bullets in place
   - add only net-new bullets
   - deduplicate semantically similar bullets
6. **User confirmation (before writing):** Present each new or changed bullet to the user: "I learned: [bullet]. Keep? (yes / no / edit)." Wait for reply. If user says "no", drop it. If "edit", apply the edit. If "yes" or "skip confirmation", proceed. User may say "skip confirmation" to write all without prompting.
7. Write updated `AGENTS.md` and the incremental index:
   - write merged content to `AGENTS.md`
   - store latest mtimes for processed files in the index
   - remove index entries for files that no longer exist
8. **Context index alignment:** If the repo uses `docs/refs/context-index.json` and `pointers.workspace` points at `AGENTS.md` (or you changed durable workspace facts that belong in the handoff manifest), suggest updating the index: set `last_reviewed` to today (ISO `YYYY-MM-DD`), confirm `pointers.workspace` still resolves, and adjust `intent_source` or other pointers if discovery/PRD precedence changed. Run `npm run check:context-index` after edits. Do not silently rewrite the index without user confirmation unless the user asked to refresh it.

## AGENTS.md Output Contract

- Keep only these sections:
  - `## Learned User Preferences`
  - `## Learned Workspace Facts`
- Use plain bullet points only.
- Do not write evidence/confidence tags in the body.
- **Optional metadata** (for debugging/audit): Keep `.cursor/hooks/state/agents-metadata.json` mapping bullet text to `{ sourceTranscriptId?, confidence: "high"|"medium"|"low" }` when the user wants traceability. Omit this file unless explicitly requested.
- Do not write process instructions, rationale, or metadata blocks.

## Inclusion Bar

Keep an item only if all are true:

- actionable in future sessions
- stable across sessions
- repeated in multiple transcripts, or explicitly stated as a broad rule
- non-sensitive

## Exclusions

Never store:

- secrets, tokens, credentials, private personal data
- one-off task instructions
- transient details (branch names, commit hashes, temporary errors)

## Limitations

- **Stop hook:** The `stop` hook runs `scripts/pn-continual-learning-stop.mjs` and may return `followup_message` to trigger this skill. Cursor hooks can fail to run or deliver output on some platforms (e.g. Windows) or versions. If AGENTS.md does not auto-update, run this skill manually when asked to maintain memory.
- **Fallback:** Invoke this skill directly (e.g. "Run pn-continual-learning to update AGENTS.md") when the hook does not trigger.

## Incremental Index Format

```json
{
  "version": 1,
  "transcripts": {
    "/abs/path/to/file.jsonl": {
      "mtimeMs": 1730000000000,
      "lastProcessedAt": "2026-02-18T12:00:00.000Z"
    }
  }
}
```
