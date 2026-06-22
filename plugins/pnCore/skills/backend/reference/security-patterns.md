# Security Patterns

## OWASP Top 10 — Actionable Patterns

### Injection (SQL, Command, LDAP)

**Never interpolate user input into queries.** Use parameterized queries — always.

```typescript
// BAD — SQL injection via string concatenation
const users = await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// GOOD — parameterized
const users = await db.query("SELECT * FROM users WHERE email = $1", [email]);

// GOOD — ORM (also parameterized under the hood)
const user = await prisma.user.findUnique({ where: { email } });

// BAD — command injection
exec(`ffmpeg -i ${userFilename} output.mp4`);

// GOOD — never pass user data to shell; use safe APIs
import { execFile } from "child_process";
execFile("ffmpeg", ["-i", sanitizedPath, "output.mp4"], callback);
```

Same principle applies to: LDAP queries, XML/XPath, NoSQL operators (`$where` in MongoDB), template engines.

### Broken Authentication

**Authentication decisions that recur in the wild:**

```typescript
// JWT — always verify algorithm explicitly; never trust the header's alg claim
import jwt from "jsonwebtoken";

// BAD — alg:none attack: attacker sets algorithm to "none", skips signature
const payload = jwt.verify(token, secret); // default trusts alg from header in some libs

// GOOD — pin the algorithm
const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });

// JWT expiry — always set exp
const token = jwt.sign({ userId: user.id }, secret, {
  algorithm: "HS256",
  expiresIn: "15m",    // short-lived access tokens
});

// Refresh tokens — store hash in DB, not plaintext
const hashedToken = await bcrypt.hash(refreshToken, 10);
await db.refreshTokens.create({ userId, tokenHash: hashedToken });
```

Password storage:
```typescript
// GOOD — bcrypt with cost factor ≥ 12
const hash = await bcrypt.hash(password, 12);
const valid = await bcrypt.compare(input, hash);

// Argon2id is preferred for new systems (more memory-hard)
import { hash, verify } from "@node-rs/argon2";
const hash = await hash(password, { memoryCost: 65536, timeCost: 3 });
```

**Session tokens must be:**
- Cryptographically random (use `crypto.randomBytes(32)`, not `Math.random()`)
- Long enough (≥ 256 bits)
- Invalidated server-side on logout (not just deleted from client)

### Broken Access Control

**Authorization is not the same as authentication.** Being logged in does not mean you can access any resource.

```typescript
// BAD — trusts client-supplied user ID to scope data
app.get("/orders/:orderId", async (req, res) => {
  const order = await db.orders.findById(req.params.orderId);
  res.json(order); // anyone can fetch any order by guessing IDs
});

// GOOD — scope query to authenticated user
app.get("/orders/:orderId", authenticate, async (req, res) => {
  const order = await db.orders.findFirst({
    where: { id: req.params.orderId, userId: req.user.id }, // ownership check
  });
  if (!order) return res.status(404).json({ error: { code: "NOT_FOUND" } });
  res.json({ data: order });
});
```

RBAC implementation:
```typescript
// Permission check middleware
function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.roles.includes(role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
    }
    next();
  };
}

app.delete("/admin/users/:id", authenticate, requireRole("admin"), deleteUser);
```

### Input Validation

**Validate at the boundary.** Every endpoint that accepts input must validate before processing.

```typescript
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).trim(),
  role: z.enum(["user", "moderator"]).default("user"),
});

app.post("/users", authenticate, async (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Invalid request data",
        details: result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      },
    });
  }
  const user = await createUser(result.data);
  res.status(201).json({ data: user });
});
```

Rules:
- Validate **type, format, length, range** for every field
- **Allowlist** enum values — never trust that the client sends only expected strings
- Strip unknown fields before processing (`z.object({}).strict()` or ORM `select`)

### Secrets Management

```typescript
// BAD — secret in source code
const stripeKey = "sk_live_REDACTED_EXAMPLE_NOT_A_REAL_KEY";

// BAD — secret in .env committed to git
// .env files should never be committed (add to .gitignore)

// GOOD — read from environment at runtime
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is required");
```

**Secret rotation:**
- Rotate secrets after any suspected exposure
- Use short-lived credentials (AWS IAM roles, Google Workload Identity) instead of long-lived keys where possible
- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, 1Password Secrets Automation) for production

### CORS Configuration

```typescript
// BAD — open CORS allows any origin to make credentialed requests
app.use(cors({ origin: "*", credentials: true }));
// credentials: true with origin: "*" is actually blocked by browsers,
// but the intent is still wrong and misleads the team

// GOOD — explicit allowlist
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "").split(",");
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error(`Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));
```

### CSRF Protection

CSRF attacks are relevant for cookie-based session auth.

```typescript
// For cookie-based auth: require CSRF token in state-changing requests
import csrf from "csurf";
app.use(csrf({ cookie: { httpOnly: true, sameSite: "strict" } }));

// For JWT in Authorization header: CSRF is not a risk
// (browser cannot set Authorization header cross-origin via <form> or fetch without CORS)

// SameSite=Strict on session cookies provides strong CSRF protection in modern browsers
res.cookie("session", token, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

### Security Headers

```typescript
import helmet from "helmet";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

## Rate Limiting

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 req / 10 sec
});

app.use("/api/auth", async (req, res, next) => {
  const identifier = req.ip ?? "unknown";
  const { success, reset } = await ratelimit.limit(identifier);
  if (!success) {
    res.setHeader("Retry-After", Math.ceil((reset - Date.now()) / 1000));
    return res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests" } });
  }
  next();
});
```

Apply tighter limits to auth routes (`/login`, `/register`, `/forgot-password`) than general API routes.

## Named Anti-Patterns

**"Bearer Everywhere"**
Using `Authorization: Bearer <token>` for all requests including state-changing ones from browser-based apps, but storing the token in `localStorage`. `localStorage` is readable by any JavaScript on the page — XSS can steal it. Use `httpOnly` cookies for session tokens in browser apps. Use Bearer tokens for server-to-server.

**"Validate Later"**
Accepting raw input, storing it, and planning to validate "when it's used." Data that enters the database unvalidated is a liability. Validate at the boundary — the moment data enters your system.

**"The Dev .env in Prod"**
Committing `.env.development` with real API keys "just for CI" or "just for convenience." Every secret that touches git eventually leaks. Use environment variable injection from a secrets manager or CI/CD secrets store.

**"Trust the Client's ID"**
Accepting a `userId` or `accountId` from the request body or query string and using it directly in queries. The authenticated user ID must come exclusively from the verified JWT or session, never from user-supplied input.

**"Unbounded Token Expiry"**
JWT access tokens with `expiresIn: "1y"` or no expiry at all. A leaked long-lived token is permanently dangerous. Access tokens should expire in 15–60 minutes; refresh tokens can be longer with revocation support.

**"Open CORS in Production"**
`origin: "*"` in production allows any site to make API calls using the user's cookies. Maintain an explicit origin allowlist derived from environment configuration.
