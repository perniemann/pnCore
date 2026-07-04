---
name: pn-security-audit
description: "Security review for OWASP, auth (JWT/OAuth2), CORS/CSP, input validation, encryption. Use for security reviews, auth flows, or vulnerability fixes."
---

# Security audit

**When used as a standalone skill, begin every response with** `[pn-skill] 🔺`

## When to use

- Reviewing auth flows, API endpoints, or data handling for OWASP Top 10:2025 vulnerabilities.
- Auditing JWT/OAuth2/SAML implementation, CORS config, CSP headers, or input validation.
- Preparing for a production release that involves authentication, user data, or third-party integrations.
- Complementing pn-dependency-audit with a code-level security pass.

## Focus areas

- Authentication/authorization (JWT, OAuth2, SAML)
- OWASP Top 10:2025 vulnerability detection
- Secure API design and CORS configuration
- Input validation and SQL injection prevention
- Encryption (at rest and in transit)
- Security headers and CSP policies

## Approach

1. Defense in depth — multiple security layers
2. Principle of least privilege
3. Never trust user input — validate everything
4. Fail securely — no information leakage
5. Regular dependency scanning — Use pn-dependency-audit for a dedicated dependency/CVE pass.

## Guardrails

- Focus on practical fixes over theoretical risks
- Include OWASP references where applicable
- Reference pn-discovery-questionnaire security section when scope is unknown
- For dependency and CVE checks, use pn-dependency-audit
- For AI/agent integrations (MCP, plugins, orchestration), also consider OWASP Top 10 for Agentic Applications 2026: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/

## Sources

- OWASP Top 10:2025 — https://owasp.org/Top10/2025/

## Output

- Security audit report with severity levels (critical, high, medium)
- Secure implementation code with comments where relevant
- Security checklist for the specific feature
- Recommended security headers configuration
- Test cases for security scenarios (if applicable)
