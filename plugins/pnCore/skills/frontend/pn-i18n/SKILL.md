---
name: pn-i18n
description: "Internationalisation for Next.js, React, and Astro. Covers next-intl, react-i18next, ICU message format, locale routing, RTL layout, and pluralisation. Use when adding multi-language support or locale-aware formatting."
---

# Internationalisation (i18n)

## When to use

- Adding multi-language support to a Next.js, React, or Astro project
- Setting up locale routing (`/en`, `/fr`, `/ar`) and language detection
- Writing or reviewing translation message files
- Handling pluralisation, date/number/currency formatting per locale
- Supporting RTL languages (Arabic, Hebrew, Persian)

## Library choice

| Project | Library | When to prefer |
|---|---|---|
| Next.js App Router | `next-intl` | Default choice — tight App Router integration, RSC support |
| Next.js Pages Router | `next-intl` or `next-i18next` | `next-i18next` for older codebases |
| React SPA | `react-i18next` | Most flexible; works with Vite and CRA |
| Astro | `astro-i18n-aut` or `@astrolicious/i18n` | Static site generation with locale routes |
| Shared (any framework) | `@formatjs/intl` + ICU | Low-level; maximum format control |

## next-intl setup (Next.js App Router)

```
src/
  app/
    [locale]/
      layout.tsx
      page.tsx
  i18n/
    routing.ts
    request.ts
  messages/
    en.json
    fr.json
    ar.json
```

```typescript
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
});

// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

```typescript
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function LocaleLayout({ children, params: { locale } }) {
  const messages = await getMessages();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

## Message format (ICU)

Use ICU message format for all non-trivial strings. Never concatenate translated strings.

```json
{
  "greeting": "Hello, {name}!",
  "itemCount": "{count, plural, =0 {No items} one {# item} other {# items}}",
  "lastSeen": "Last seen {date, date, medium}",
  "price": "{amount, number, ::currency/USD}",
  "gender": "{gender, select, male {He} female {She} other {They}} replied."
}
```

```typescript
// Using next-intl
const t = useTranslations("common");
t("greeting", { name: "Alice" });         // "Hello, Alice!"
t("itemCount", { count: 3 });             // "3 items"
t("price", { amount: 42.5 });             // "$42.50"
```

## Locale routing patterns

- Always include the locale in the URL: `/en/about`, `/fr/about`.
- Use middleware to detect preferred locale from `Accept-Language` header with a stored cookie fallback.
- Redirect `/` to `/${defaultLocale}` or to the detected locale.
- Use canonical URLs with `hreflang` for SEO: `<link rel="alternate" hreflang="fr" href="/fr/about" />`.

```typescript
// next.config.ts — rewrite to preserve clean URLs
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin();
export default withNextIntl({ /* next config */ });
```

## Date, number, and currency formatting

Always use `Intl` APIs or the library's format utilities — never format dates/numbers manually.

```typescript
// next-intl format utilities
const format = useFormatter();
format.dateTime(new Date(), { dateStyle: "medium" });   // "Mar 15, 2026"
format.number(1234567.89, { style: "currency", currency: "USD" });  // "$1,234,567.89"
format.relativeTime(-3, "day");  // "3 days ago"
```

## RTL support

- Set `dir="rtl"` on `<html>` for RTL locales (Arabic `ar`, Hebrew `he`, Persian `fa`).
- Use CSS logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline`) instead of physical (`margin-left`, `padding-right`).
- Use `text-align: start` and `float: inline-start` for automatic mirroring.
- Test with real RTL content — lorem ipsum does not reveal RTL bugs.
- Avoid CSS `transform: scaleX(-1)` hacks; fix layouts with logical properties.

```css
/* Physical — breaks RTL */
.card { margin-left: 16px; padding-right: 8px; text-align: left; }

/* Logical — works in both directions */
.card { margin-inline-start: 16px; padding-inline-end: 8px; text-align: start; }
```

## Translation workflow

1. Keep English messages as the source of truth in `messages/en.json`.
2. All keys must exist in the source locale before merging — CI should fail on missing keys.
3. Interpolated variables must be type-safe: use `next-intl`'s TypeScript integration to catch missing keys at compile time.
4. Never hardcode strings in JSX — every visible string must come from a translation key.
5. Provide context comments for translators on ambiguous keys: use `// @ts-expect-error` blocks or a translation management platform (Crowdin, Phrase, Lokalise).

## Output

- Locale routing configuration
- Message files with ICU format
- RTL-safe CSS (logical properties)
- Middleware for locale detection
- `hreflang` tags for SEO

## Guardrails

- Reference `pn-seo` for `hreflang` and canonical URL patterns.
- Reference `pn-frontend-design-philosophy` for typography considerations in non-Latin scripts.
- Test with real RTL locales, not just mirrored English.
