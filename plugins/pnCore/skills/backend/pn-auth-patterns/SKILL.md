---
name: pn-auth-patterns
description: Authentication implementation patterns. JWT rotation, OAuth2 PKCE, session vs token trade-offs, NextAuth.js v5, Clerk, and Supabase Auth. Use when implementing or reviewing auth flows.
---

# Auth patterns

## When to use

- Implementing authentication or authorisation for the first time in a project
- Choosing between session-based, JWT, or third-party auth (Clerk, Supabase Auth, Auth0)
- Adding OAuth2 / social login flows
- Reviewing JWT expiry, refresh token rotation, or session invalidation
- Adding role-based or attribute-based access control (RBAC/ABAC)

## Library decision matrix

| Project | Recommended | When to use |
|---|---|---|
| Next.js (full-stack) | **NextAuth.js v5** (Auth.js) | Open-source, multi-provider, sessions or JWT, edge-ready |
| Next.js with managed UX | **Clerk** | Drop-in UI components, org/team support, minimal setup |
| Supabase project | **Supabase Auth** | Already on Supabase; use built-in auth helpers |
| Any React SPA (separate API) | **Auth.js** or custom JWT | When backend is separate |
| Enterprise / B2B | **Auth0** or **WorkOS** | SSO, SAML, SCIM provisioning |

## NextAuth.js v5 (Auth.js)

```typescript
// auth.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({ clientId: process.env.AUTH_GITHUB_ID!, clientSecret: process.env.AUTH_GITHUB_SECRET! }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize({ email, password }) {
        const user = await verifyCredentials(email as string, password as string);
        return user ?? null; // null triggers "Invalid credentials" error
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role; // attach custom claims
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as string;
      return session;
    },
  },
});

// Route handler: app/api/auth/[...nextauth]/route.ts
export { handlers as GET, handlers as POST } from "@/auth";

// Protect a server component
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <div>Welcome, {session.user?.name}</div>;
}
```

## OAuth2 PKCE (for SPAs and mobile)

PKCE (Proof Key for Code Exchange) is required for public clients (browser SPAs, mobile apps) — never use the implicit flow.

```typescript
// 1. Generate code verifier + challenge
const codeVerifier = crypto.randomBytes(32).toString("base64url");
const codeChallenge = crypto
  .createHash("sha256")
  .update(codeVerifier)
  .digest("base64url");

// 2. Redirect to authorization URL with challenge
const authUrl = new URL("https://example.invalid/oauth2/authorize");
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("code_challenge", codeChallenge);
authUrl.searchParams.set("code_challenge_method", "S256");
authUrl.searchParams.set("state", generateState()); // CSRF protection

// 3. Exchange code for tokens (include verifier, not challenge)
const tokenRes = await fetch("https://example.invalid/oauth2/token", {
  method: "POST",
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code, redirect_uri: REDIRECT_URI, client_id: CLIENT_ID,
    code_verifier: codeVerifier,
  }),
});
```

## JWT patterns

### Structure and signing

- Sign with RS256 (asymmetric) in multi-service architectures; HS256 for single-service.
- Keep payload small: only include `sub`, `iat`, `exp`, `jti`, and application-specific claims that change infrequently.
- Never store sensitive data (passwords, PII) in JWT payload — it is base64-encoded, not encrypted.

### Expiry and rotation

```
Short-lived bearer credential:  (15 min – 1 hour)
Long-lived refresh credential:   (7–30 days), single-use, rotated on use
```

```typescript
// Refresh token rotation
async function refreshAccessToken(refreshToken: string) {
  const stored = await db.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw new Error("Invalid or expired refresh token");
  }
  // Rotate: invalidate old, issue new
  await db.refreshToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } });
  const newRefresh = await db.refreshToken.create({ data: { userId: stored.userId, expiresAt: addDays(new Date(), 30) } });
  const shortLivedJwt = signJwt({ sub: stored.userId }, { expiresIn: "15m" });
  return { accessToken: shortLivedJwt, refreshToken: newRefresh.token };
}
```

### Revocation

- Use a `jti` (JWT ID) blocklist in Redis for short-lived JWTs that need early revocation.
- For refresh tokens, store in DB with `usedAt` and `expiresAt` columns (enables rotation detection).
- On logout, invalidate both tokens.

## Supabase Auth

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Sign in with magic link
await supabase.auth.signInWithOtp({ email: "user@example.com" });

// Sign in with OAuth
await supabase.auth.signInWithOAuth({ provider: "github" });

// Get current session (server component)
const { data: { session } } = await supabase.auth.getSession();

// RLS: user can only access their own rows
// In Supabase SQL: CREATE POLICY "Own rows" ON todos USING (auth.uid() = user_id);
```

## RBAC patterns

```typescript
// Enum-based roles
type Role = "admin" | "editor" | "viewer";

const permissions = {
  admin:  ["read", "write", "delete", "manage_users"],
  editor: ["read", "write"],
  viewer: ["read"],
} satisfies Record<Role, string[]>;

function can(role: Role, action: string): boolean {
  return permissions[role].includes(action);
}

// Middleware: protect Next.js routes
export function middleware(req: NextRequest) {
  const session = getSession(req);
  if (!session || !can(session.user.role, "write")) {
    return NextResponse.redirect(new URL("/403", req.url));
  }
}
```

## Security checklist

- [ ] Tokens are `httpOnly` cookies (not `localStorage`) to prevent XSS access.
- [ ] CSRF protection enabled for cookie-based sessions (SameSite=Lax or CSRF tokens).
- [ ] Refresh token rotation detects reuse attempts (blocklist or single-use DB row).
- [ ] `exp` claim validated on every request; clock skew tolerance ≤ 30s.
- [ ] Credentials route uses constant-time comparison for passwords (`bcrypt.compare`).
- [ ] Account lockout after N failed attempts (rate-limit per IP + per account).
- [ ] OAuth `state` parameter validated to prevent CSRF on redirect.

## Guardrails

- Reference `pn-security-audit` for OWASP A07 (Identification and Authentication Failures).
- Reference `pn-rate-limiting` for login endpoint rate limiting.
- Reference `pn-supabase` for Supabase RLS policy patterns that depend on `auth.uid()`.
