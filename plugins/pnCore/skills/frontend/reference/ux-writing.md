# UX Writing

## Every Word Is a Design Decision

Bad copy makes good design feel broken. Users read error messages. They notice button labels that don't match what happens. They abandon flows when instructions are confusing. UX writing is not a final pass — it belongs in the design process.

## Button Labels

**The rule:** Action-object format. The button says what it does to what.

| Wrong | Right | Why |
|---|---|---|
| Submit | Save draft | "Submit" doesn't say where it goes |
| OK | Got it | "OK" is meaningless — what are they agreeing to? |
| Yes / No | Delete project / Keep project | Confirm what the action IS |
| Continue | Review order | Says what the next step IS |
| Click here | Download report | "Click here" requires reading context |
| Send | Send to team | More specific = more confidence |

**Destructive action confirmation:**
```
"Delete project" → dialog:
Heading: "Delete Design System v2?"
Body: "This will permanently remove all files and collaborators. This can't be undone."
Buttons: [Cancel] [Delete project]
                    ↑
              Not "Yes, delete" — repeat the specific action
```

**Primary vs secondary hierarchy:**
- One primary action per view (filled button)
- Secondary actions: outlined or ghost button
- Destructive: red/danger variant, always secondary until the final confirmation
- Never two primary buttons side by side

## Error Messages

**Error message anatomy:** What happened → Why (if useful) → What to do.

| Wrong | Right |
|---|---|
| "Error" | "Couldn't save changes — you're offline. Check your connection and try again." |
| "Invalid input" | "Email address looks incomplete. Include an @ and a domain (e.g., you@example.com)." |
| "Something went wrong" | "Couldn't load your projects. Refresh the page, or contact support if this continues." |
| "Request failed with status 403" | "You don't have permission to view this. Ask your admin for access." |
| "Password doesn't meet requirements" | "Password needs at least 8 characters and one number." |

**Error message rules:**
- Never blame the user ("you entered," "you failed")
- Be specific about what went wrong — "invalid input" tells the user nothing
- Include a recovery action — what should they do next?
- Use plain language — no HTTP status codes, no internal error codes in user-facing messages
- Place the error near the field it relates to, not just at the top of the form

## Empty States

Empty states are the highest-value teaching surface. When a user sees a list with nothing in it, they're asking: "What is this for and how do I start?"

**Empty state copywriting structure:**
1. **State what's empty** (plain fact, no drama): "No projects yet"
2. **Explain what will go here** (value prop): "Projects keep your work organized and let you collaborate with your team"
3. **Primary CTA**: "Create your first project"
4. **Optional escape hatch**: "Browse templates" / "Import from..." / "Learn more"

```
✗ "No items found."
✗ "Nothing to see here 👀"
✓ "No integrations yet
   Connect your tools to automate workflows and save time on repetitive tasks.
   [Browse integrations]"
```

**After search with no results:**
```
"No results for 'invoicex'"
Check the spelling, or try a broader search.
[Browse all invoices]
```

Don't just dead-end the user. Give them the next step.

## Microcopy Anti-Patterns

### Redundant Introductions

```
✗ "Welcome to the dashboard. Here you can see an overview of your account."
   (The dashboard heading already says "Dashboard")
✓ [Just show the dashboard]
```

### Stating the Obvious

```
✗ "Click the button below to continue"
   (The button is right there)
✓ [Just the button: "Continue"]
```

### Jargon and Internal Terms

```
✗ "Sync failed due to upstream API rate limiting"
✓ "Sync paused — too many requests. It'll retry automatically in a few minutes."

✗ "Unauthenticated session detected"
✓ "You've been signed out. Sign in again to continue."
```

### Vague CTAs at End of Long Copy

```
✗ "...and that's why our platform is the best choice for growing teams. Get started today."
✓ "Start your free 14-day trial — no credit card required."
```

### Over-hedged Confirmation Copy

```
✗ "Are you sure you want to delete this? This action cannot be undone."
✓ "Delete 'Marketing Assets'? This can't be undone." (heading: be specific)
```

## Tone Consistency

Define your tone before writing anything:

| Dimension | Options | Example |
|---|---|---|
| **Formality** | Casual ↔ Professional | "Let's go" vs "Get started" |
| **Voice** | First person (we/you) vs System ("Your account...") | "We couldn't connect" vs "Connection failed" |
| **Brevity** | Minimal ↔ Explanatory | Button labels vs onboarding instructions |
| **Personality** | Neutral ↔ Expressive | Utility tool vs consumer app |

**Consistency rules:**
- Pick one and stick to it — mixing formal and casual feels schizophrenic
- Error messages and empty states should match the same tone as the rest of the product
- Marketing copy and product UI should be related but product UI skews more functional

## Headings and Labels

```
✗ "User Settings"  (generic, every product has this)
✓ "Your account"   (personal)
✓ "Preferences"    (functional)

✗ "Data Management"
✓ "Your data"

✗ "Please provide your email address below"
✓ "Email"   (the label IS the instruction)

✗ "Enter a descriptive name for this item"
✓ "Project name"  +  placeholder: "e.g. Website redesign"
```

## Placeholder Text

Placeholder text vanishes when the user types. Use it for examples, not instructions.

```
✗ Placeholder: "Enter your email address here"
   (This is what the label is for)

✓ Label: "Email"
   Placeholder: "you@company.com"

✗ Placeholder: "Search for anything..."
✓ Placeholder: "Search projects, files, members..."  (specific = useful)
```

---

**Avoid:** Vague CTAs ("Submit", "OK", "Click here"). Blaming the user in error messages. Empty states with no action or explanation. Jargon in user-facing strings. Redundant text that restates what the user can already see. Different tone in different parts of the same product.
