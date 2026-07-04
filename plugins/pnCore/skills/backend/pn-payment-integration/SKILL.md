---
name: pn-payment-integration
description: "Stripe, PayPal, Square integration. Checkout, subscriptions, webhooks, PCI compliance. Use when implementing payments, billing, or subscription features."
---

# Payment integration

## When to use

- Implementing payments, billing, or subscription features
- Checkout flows and payment forms
- Webhook handling for payment events
- Migrating from test to production payment mode

**When Stripe MCP is available:** Use its tools for Stripe API lookups, product/price/subscription schema, SDK examples, and Stripe-specific operations. Combine with this skill for checkout patterns, webhooks, idempotency, and PCI guidance. Do not duplicate Stripe docs manually when MCP can provide them.

## Focus areas

- Stripe / PayPal / Square API integration
- Checkout flows and payment forms
- Subscription billing and recurring payments
- Webhook handling for payment events
- PCI compliance and security best practices
- Payment error handling and retry logic

## Approach

1. **Security first** — Never log sensitive card data; use official SDKs.
2. **Idempotency** — Implement for all payment operations (create intent, confirm, refund).
3. **Edge cases** — Handle failed payments, disputes, refunds, webhook retries.
4. **Test mode first** — Clear migration path to production; separate API keys per environment.
5. **Webhooks** — Comprehensive handling for async events; verify signatures; handle duplicate delivery.

## Output

- Payment integration code with error handling
- Webhook endpoint implementations (verify signature, idempotent handlers)
- Database schema for payment records (status, idempotency keys)
- Security checklist (PCI compliance points)
- Test payment scenarios and edge cases
- Environment variable configuration (API keys, webhook secrets)

## Sources

- PCI SSC Data Security Standard (PCI DSS) v4.0 — https://www.pcisecuritystandards.org/
- Reference pn-security-audit for auth and API security

## Guardrails

- Always use official SDKs; include both server-side and client-side code where needed
- Reference pn-security-audit for auth and API security
- Reference pn-node-api for env/secrets and error handling
