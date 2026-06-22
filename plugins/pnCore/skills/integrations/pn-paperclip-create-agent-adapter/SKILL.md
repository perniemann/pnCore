---
name: pn-paperclip-create-agent-adapter
description: Technical guide for creating a new Paperclip agent adapter. Use when building a new adapter package, adding support for a new AI coding tool (e.g. Cursor, e2b), or modifying the adapter system.
---

# Creating a Paperclip Agent Adapter

An adapter bridges Paperclip's orchestration layer to a specific AI agent runtime (Claude Code, Codex CLI, Cursor, HTTP endpoint, etc.).

## Architecture

Each adapter in `packages/adapters/<name>/` provides:

- **Server:** `execute`, sessionCodec, parse helpers
- **UI:** parseStdoutLine, buildConfig for agent creation form
- **CLI:** formatStdoutEvent for `paperclipai run --watch`

## When to use

- Building a new adapter for Cursor, e2b, or another runtime
- Extending the existing claude-local or codex-local adapters
- Understanding Paperclip's execution and session persistence model

## Reference

For the full guide (interfaces, module structure, registration points, conventions), see the upstream [Paperclip create-agent-adapter skill](https://github.com/paperclipai/paperclip/blob/master/skills/create-agent-adapter/SKILL.md).

## Output

- Adapter layout and registration plan consistent with `packages/adapters/<name>/` (server, UI, CLI) and Paperclip execution contracts.
- List of files or modules to add or change; defer verbatim upstream text to the Paperclip skill when it is authoritative.
