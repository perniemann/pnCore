---
name: pn-seo
description: "Technical SEO for Next.js, Astro, and React apps. Covers metadata, Open Graph, JSON-LD structured data, sitemap, robots.txt, and Core Web Vitals as ranking signals. Use when optimising a site for search visibility."
---

# Technical SEO

## When to use

- Adding or reviewing `<meta>` tags, Open Graph, and Twitter Card markup
- Generating a `sitemap.xml` or configuring `robots.txt`
- Adding JSON-LD structured data (Organisation, Article, Product, FAQ, BreadcrumbList)
- Auditing Core Web Vitals as ranking signals (LCP, INP, CLS)
- Setting up canonical URLs, `hreflang`, and pagination (`rel=next/prev`)
- Improving crawlability: internal linking, URL structure, redirect chains

## Meta tags (Next.js App Router)

```typescript
// app/layout.tsx or app/[slug]/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Site Name", template: "%s | Site Name" },
  description: "150–160 character description; unique per page.",
  openGraph: {
    title: "Page Title",
    description: "OG description — same as meta description or slightly punchier.",
    url: "https://example.com/page",
    siteName: "Site Name",
    images: [{ url: "https://example.com/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Page Title",
    description: "Twitter description",
    images: ["https://example.com/og.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://example.com/page" },
};
```

## Open Graph image

- Minimum 1200×630px; 2:1 ratio preferred.
- Use `next/og` (`ImageResponse`) to generate OG images dynamically at the edge.
- Always include `alt` text on the image object.

```typescript
// app/og/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? "Default Title";
  return new ImageResponse(
    <div style={{ display: "flex", fontSize: 60, background: "#fff", width: "100%", height: "100%" }}>
      {title}
    </div>,
    { width: 1200, height: 630 }
  );
}
```

## JSON-LD structured data

Include structured data for rich results in Google Search. Use `<script type="application/ld+json">` in the page `<head>`.

```typescript
// Reusable component — JSON-LD via script children (avoid raw HTML injection APIs)
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" suppressHydrationWarning>
      {JSON.stringify(data)}
    </script>
  );
}

// Article schema
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Article Title",
  author: { "@type": "Person", name: "Author Name" },
  datePublished: "2026-03-15",
  dateModified: "2026-03-15",
  image: "https://example.com/article-image.jpg",
  publisher: {
    "@type": "Organization",
    name: "Publisher Name",
    logo: { "@type": "ImageObject", url: "https://example.com/logo.png" },
  },
};

// FAQ schema — triggers FAQ rich result
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "What is X?", acceptedAnswer: { "@type": "Answer", text: "X is..." } },
  ],
};

// BreadcrumbList
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://example.com" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://example.com/blog" },
  ],
};
```

## Sitemap

```typescript
// app/sitemap.ts (Next.js App Router)
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetchPosts();
  return [
    { url: "https://example.com", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    ...posts.map((post) => ({
      url: `https://example.com/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
```

- Submit `sitemap.xml` to Google Search Console and Bing Webmaster Tools.
- For large sites (> 50k URLs), use sitemap index files.

## robots.txt

```typescript
// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/_next/"] },
    ],
    sitemap: "https://example.com/sitemap.xml",
  };
}
```

- Disallow all `/api/` routes — they have no search value and waste crawl budget.
- Never disallow CSS or JS files that render page content — Googlebot needs them.

## Core Web Vitals as ranking signals

Google uses CWV in the Page Experience signal. Target: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1.

| Metric | Primary cause | Fix |
|---|---|---|
| LCP | Slow hero image or server response | Preload LCP image; use `priority` on `next/image`; use CDN |
| INP | Long tasks on main thread | Split with `requestIdleCallback`; defer non-critical JS |
| CLS | Images/embeds without dimensions | Set explicit `width`/`height`; use `aspect-ratio` CSS |

```html
<!-- LCP image preload -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
```

## URL structure

- Lowercase, hyphens, no trailing slashes (or always trailing — be consistent).
- Descriptive slugs: `/blog/react-server-components-2026` not `/blog?id=123`.
- Canonical tags on all pages to prevent duplicate content.
- 301 redirect chains must not exceed 3 hops.

## hreflang (multilingual)

```html
<link rel="alternate" hreflang="en" href="https://example.com/en/page" />
<link rel="alternate" hreflang="fr" href="https://example.com/fr/page" />
<link rel="alternate" hreflang="x-default" href="https://example.com/en/page" />
```

- Every page in the hreflang set must link to all others (reciprocal).
- Include `x-default` for the fallback/default locale.

## Validation tools

- Google Rich Results Test — https://search.google.com/test/rich-results
- Schema.org validator — https://validator.schema.org/
- Google Search Console Core Web Vitals report
- PageSpeed Insights — https://pagespeed.web.dev/

## Output

- Metadata configuration per page/layout
- OG image generation route
- JSON-LD structured data components
- `sitemap.ts` and `robots.ts` files
- CWV audit notes with prioritised fixes

## Guardrails

- Reference `pn-i18n` for `hreflang` implementation in multi-locale sites.
- Reference `pn-react-next-perf` for INP and LCP performance fixes.
- Each page must have a unique `<title>` and `<meta name="description">`.
- Never add `noindex` to pages you want indexed — verify before deploying.
