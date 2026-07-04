---
name: pn-graphql
description: "GraphQL schema design, resolvers, DataLoader, Federation, and security. Use when building or reviewing GraphQL APIs with Apollo Server, Pothos, or GraphQL Yoga."
---

# GraphQL

## When to use

- Designing or implementing a GraphQL API (schema-first or code-first)
- Writing resolvers, mutations, or subscriptions
- Reviewing a GraphQL schema for N+1 problems, over-fetching, or security issues
- Setting up Apollo Server, GraphQL Yoga, or Pothos
- Adding GraphQL Federation (supergraph / subgraph split)

## Core principles

1. **Schema is the contract** — design the schema from the consumer's perspective, not the database shape.
2. **Solve N+1 before shipping** — every list resolver that calls a data source must use DataLoader or a batch-aware fetcher.
3. **Depth and complexity limits are non-negotiable** — unprotected GraphQL endpoints are trivially DoS-able via nested queries.
4. **Mutations are commands, not CRUD** — name mutations after business operations (`placeOrder`, `cancelSubscription`) not database verbs (`updateOrder`).
5. **Never expose internal IDs** — use opaque cursor-based pagination and global IDs (`node(id: "User:123")`).

## Schema design

```graphql
# Use clear domain language; avoid database column names as field names
type User {
  id: ID!
  email: String!
  displayName: String!
  orders(first: Int, after: String): OrderConnection!
  createdAt: DateTime!
}

type OrderConnection {
  edges: [OrderEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type OrderEdge {
  cursor: String!
  node: Order!
}

# Errors as values — union return types for mutations
type PlaceOrderResult {
  order: Order
  error: PlaceOrderError
}

enum PlaceOrderError {
  INSUFFICIENT_INVENTORY
  PAYMENT_DECLINED
  INVALID_ADDRESS
}
```

## Resolvers (Apollo Server / GraphQL Yoga)

```typescript
import { ApolloServer } from "@apollo/server";
import DataLoader from "dataloader";

// Batch loader — resolves N users in one query
const userLoader = new DataLoader<string, User>(async (ids) => {
  const users = await db.user.findMany({ where: { id: { in: [...ids] } } });
  return ids.map((id) => users.find((u) => u.id === id) ?? new Error(`User ${id} not found`));
});

const resolvers = {
  Query: {
    user: (_: unknown, { id }: { id: string }, { loaders }: Context) =>
      loaders.user.load(id),
  },
  Order: {
    // Field resolver — batched via DataLoader, not N+1
    customer: (order: Order, _: unknown, { loaders }: Context) =>
      loaders.user.load(order.customerId),
  },
  Mutation: {
    placeOrder: async (_: unknown, args: PlaceOrderInput, { user }: Context) => {
      if (!user) throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHENTICATED" } });
      // business logic
    },
  },
};
```

## Code-first with Pothos

```typescript
import SchemaBuilder from "@pothos/core";

const builder = new SchemaBuilder<{ Context: Context }>({});

builder.queryType({
  fields: (t) => ({
    user: t.field({
      type: UserRef,
      args: { id: t.arg.id({ required: true }) },
      resolve: (_, { id }, { loaders }) => loaders.user.load(String(id)),
    }),
  }),
});
```

## Security

| Threat | Mitigation |
|---|---|
| Query depth attack | Set `maxDepth: 7` in `graphql-depth-limit` |
| Query complexity attack | `graphql-query-complexity` with cost per field |
| Introspection in production | Disable `introspection` for production; allow for internal tools |
| Batch injection | Use persisted queries in production (`@apollo/server/cache-control`) |
| Auth bypass | Resolve authentication at the context level, not per resolver |
| Field enumeration | Use schema directives (`@auth`) + directive validators |

```typescript
// Context-level auth — applied to every request
const server = new ApolloServer({
  schema,
  plugins: [ApolloServerPluginLandingPageDisabledPlugin()], // disable in prod
});

// Depth limit plugin
import depthLimit from "graphql-depth-limit";
const schema = makeExecutableSchema({ typeDefs, resolvers });
const validationRules = [depthLimit(7)];
```

## Pagination

- Always use cursor-based pagination (Relay spec) for lists; avoid offset pagination for large datasets.
- Implement `first` / `after` and optionally `last` / `before`; return `PageInfo.hasNextPage`.
- Never return unbounded lists — set a default and maximum for `first` (e.g. default 20, max 100).

## Federation (Apollo Federation v2)

```graphql
# Subgraph: users service
extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

type User @key(fields: "id") {
  id: ID!
  email: String!
}

# Subgraph: orders service references User
type Order {
  id: ID!
  customer: User! # resolved via @key federation
}

extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}
```

- Each subgraph owns its entity; use `@key` for cross-subgraph references.
- Use `rover subgraph check` in CI to catch breaking changes before publish.
- The router (Apollo Router or `@apollo/gateway`) composes subgraphs at build time.

## Output

- GraphQL schema file (`schema.graphql` or introspection JSON)
- Resolver implementations with DataLoader batching
- Security configuration (depth limit, complexity, introspection flag)
- Pagination implementation (Relay spec)

## Guardrails

- Reference `pn-backend-philosophy` for error handling, auth, and secrets.
- Reference `pn-security-audit` for OWASP A01 (Broken Access Control) as applied to resolvers.
- Reference `pn-auth-patterns` for JWT/session context setup used in resolvers.
