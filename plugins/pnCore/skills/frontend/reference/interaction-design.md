# Interaction Design

## The Core Principle: Make Interactions Feel Fast

Perceived performance matters more than actual performance. An interaction that completes in 800ms but shows immediate visual feedback feels faster than one that completes in 400ms with no feedback.

## Optimistic UI

Update the UI immediately and sync with the server in the background. Revert only if the operation fails.

```tsx
// Optimistic update pattern
function TodoList() {
  const [todos, setTodos] = useState(initialTodos);

  async function toggleTodo(id: string) {
    // 1. Update UI immediately
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

    try {
      // 2. Sync in background
      await api.toggleTodo(id);
    } catch {
      // 3. Revert on failure + notify user
      setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
      toast.error('Failed to update. Please try again.');
    }
  }
}
```

**When to use optimistic UI:**
- Low-risk actions with high reversibility (like/unlike, todo toggle, tag add/remove)
- Actions users repeat frequently (reduces perceived latency)

**When NOT to use:**
- Destructive irreversible actions (delete, payment)
- Actions with complex validation that can fail in non-obvious ways

## Progressive Disclosure

Start simple. Reveal sophistication through interaction. Every layer of complexity should be hidden until the user signals they need it.

**Patterns:**
- Basic fields visible → advanced options behind "Show more options"
- Primary actions visible → secondary actions on hover/focus
- Summary visible → detail in expandable section or drawer
- Step 1 visible → steps 2+ revealed as user progresses

```tsx
// Progressive form disclosure
function AdvancedForm() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <form>
      {/* Always visible — covers 80% of use cases */}
      <BasicFields />

      <button type="button" onClick={() => setShowAdvanced(v => !v)}
        aria-expanded={showAdvanced}>
        {showAdvanced ? 'Fewer options' : 'More options'}
      </button>

      {/* Advanced options — only revealed when needed */}
      {showAdvanced && (
        <div role="region" aria-label="Advanced options">
          <AdvancedFields />
        </div>
      )}
    </form>
  );
}
```

## Loading State Patterns

Choosing the wrong loading pattern creates anxiety. Choosing the right one creates confidence.

| Pattern | When to Use | When NOT to Use |
|---|---|---|
| **Skeleton screen** | Content with known shape (cards, lists, profiles) | Unknown/variable content shape |
| **Spinner** | Short operations < 2s, action confirmations | Page-level or section-level loads |
| **Progress bar** | Operations with measurable progress (upload, multi-step) | Indeterminate server-side processes |
| **Inline shimmer** | Text content loading in place | Image loading |
| **Optimistic (no loader)** | Reversible low-risk actions | Irreversible or server-critical operations |

```css
/* Skeleton shimmer animation */
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface-2) 25%,
    var(--color-surface-3) 50%,
    var(--color-surface-2) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
```

**Never use a global spinner for the entire page on re-navigation.** Use skeleton screens or streaming.

## Focus State Design

Focus states are not just accessibility compliance — they're part of the design. Invisible focus states harm keyboard users. Generic browser-default focus rings look undesigned.

```css
/* Branded focus ring — visible AND designed */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
  border-radius: calc(var(--radius-base) + 2px);  /* slightly larger than element */
}

/* Remove outline only for mouse users — never globally */
:focus:not(:focus-visible) { outline: none; }

/* Focus within a dark surface — ensure contrast */
.card-dark :focus-visible {
  outline-color: oklch(90% 0.05 var(--brand-hue));
}
```

**Focus ring rules:**
- Never `outline: none` without a replacement
- `outline-offset: 2–4px` creates visual separation from the element boundary
- Use `border-radius` matching the element so the ring hugs its shape
- Test keyboard navigation through every interactive flow

## Empty States That Teach

Empty states are the highest-value surface for user education. "No results found" is a missed opportunity. An empty state should tell the user what they can do.

**Empty state anatomy:**
1. **Acknowledge** — confirm the current state without blame ("You haven't created any projects yet")
2. **Explain value** — what will appear here and why it matters ("Projects help you organize work by team or client")
3. **Primary action** — the one thing they should do ("Create your first project")
4. **Optional secondary** — import, explore templates, view docs

```tsx
function EmptyProjectsState() {
  return (
    <div className="empty-state" role="status">
      <ProjectsIcon aria-hidden="true" />
      <h2>No projects yet</h2>
      <p>Create a project to organize work, invite teammates, and track progress.</p>
      <Button variant="primary" onClick={onCreateProject}>
        Create project
      </Button>
      <Button variant="ghost" onClick={onViewTemplates}>
        Browse templates
      </Button>
    </div>
  );
}
```

**Anti-patterns:**
- "Nothing to show here" with no action
- A sad face icon with "No results" — punishes the user for a normal state
- Hiding the empty state and showing nothing — causes confusion about whether the page loaded

## Modals: Use Sparingly

Modals interrupt flow, can't be deep-linked, break the back button, and cause accessibility problems on mobile. Use them only when:

- The action requires the user's full attention before proceeding (confirmation of destructive action)
- Quick data entry that doesn't benefit from its own page (rename, short form)

**Better alternatives:**
- **Drawer/sheet:** For larger content that needs to exist alongside the current context
- **Inline expansion:** For confirmations on the same page
- **Separate page:** For complex forms, multi-step flows, or content that should be shareable

## Form Interaction Patterns

```tsx
// Validation: on blur for individual fields, on submit for summary
function FormField({ name, validate }) {
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        onBlur={() => {
          setTouched(true);
          setError(validate(value));
        }}
        aria-invalid={touched && !!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {touched && error && (
        <span id={`${name}-error`} role="alert">{error}</span>
      )}
    </div>
  );
}
```

**Form rules:**
- Validate on blur (not on every keystroke — too aggressive)
- Show error messages near the field, not at the top of a long form
- After submit with errors, focus the first error field
- Success state must be explicit — don't just clear the form silently
- Never disable the submit button for validation — submit, then show errors

---

**Avoid:** Blocking UI during optimistic operations. Spinner for everything. Empty states with no action. Invisible focus styles. Validating on every keystroke. Modals for content that should be a page.
