---
name: pn-release-notes
description: Generate user-facing release notes from tickets, PRDs, or changelogs. Organize by New Features, Improvements, Bug Fixes, Breaking Changes. Use when announcing product updates or summarizing what shipped.
---

# Release Notes Generator

Transform technical tickets, PRDs, or internal changelogs into polished, user-facing release notes.

## When to use

- Generating release notes for a version bump, sprint close, or product launch.
- Summarizing git commits, PRs, or changelogs into user-facing language.
- Producing CHANGELOG.md entries or GitHub Release descriptions.
- Converting technical diff summaries into readable product announcements.

## Instructions

1. **Gather raw material**: Read all provided tickets, changelogs, or descriptions. Extract:
   - What changed (feature, improvement, or fix)
   - Who it affects (which user segment)
   - Why it matters (the user benefit)

2. **Categorize changes**:
   - **New Features**: Entirely new capabilities
   - **Improvements**: Enhancements to existing features
   - **Bug Fixes**: Issues resolved
   - **Breaking Changes**: Anything requiring user action (migrations, API changes)
   - **Deprecations**: Features being sunset

3. **Write each entry**:
   - Lead with the user benefit, not the technical change
   - Use plain language — avoid jargon, internal codenames, ticket numbers
   - Keep each entry to 1-3 sentences
   - Include visuals or screenshots when provided

   **Example transformations**:
   - Technical: "Implemented Redis caching layer for dashboard API endpoints"
   - User-facing: "Dashboards now load up to 3× faster, so you spend less time waiting and more time analyzing."

   - Technical: "Fixed race condition in concurrent checkout flow"
   - User-facing: "Fixed an issue where some orders could fail during high-traffic periods."

4. **Structure the release notes**:

   ```
   # [Product Name] — [Version / Date]

   ## New Features
   - **[Feature name]**: [1-2 sentence description of what it does and why it matters]

   ## Improvements
   - **[Area]**: [What got better and how it helps]

   ## Bug Fixes
   - Fixed [issue description in user terms]

   ## Breaking Changes (if any)
   - **Action required**: [What users need to do]
   ```

5. **Adjust tone** to match the product — professional for B2B, friendly for consumer, developer-focused for APIs.

**Save as:** `docs/release-notes/YYYY-MM-DD-vX.Y.Z.md` or `CHANGELOG.md` section.
