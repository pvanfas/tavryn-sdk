# tavryn-sdk

Deterministic spending policy engine and cryptographic idempotency primitives for autonomous AI agents.

Extracted from [Tavryn](https://github.com/pvanfas/tavryn), built for the [Tameion Agents Hackathon](https://github.com/pvanfas/tavryn).

## Why tavryn-sdk?

AI agents should propose financial actions, but deterministic code must govern them. An LLM should never be permitted to approve its own spend or write arbitrary transactions directly to on-chain escrows or treasuries. `tavryn-sdk` provides pure, zero-I/O boundary functions to enforce hard spending limits, category budgets, minimum savings thresholds, and idempotency guarantees.

## Installation

```bash
npm install tavryn-sdk
```

## Usage

```typescript
import { checkPolicy } from "tavryn-sdk";

const policy = { max_auto_transaction: 2000, min_savings: 200, human_approval_required_above: 5000, allowed_categories: ["software", "cloud"] };
const decision = checkPolicy("execute", policy, { amount: 1400, savings: 400, category: "software", treasuryBalance: 25000 });

if (decision.decision === "approved") {
  // Execute autonomous payment / escrow release
} else if (decision.decision === "needs_human") {
  // Dispatch notification for human-in-the-loop supervisor approval
}
```

### Idempotency Keys

Prevent duplicate agent actions or double-payments with deterministic SHA-256 idempotency hashing:

```typescript
import { computeIdempotencyKey } from "tavryn-sdk";

const key = computeIdempotencyKey({
  businessId: "biz_01HXYZ",
  contractId: "contract_456",
  negotiationId: "neg_789",
  amount: 1400,
});
```

## API Reference

### `checkPolicy(action, policy, context): PolicyResult`

Evaluates a proposed action against spending rules and treasury state:

- **`policy.max_auto_transaction`**: Maximum dollar amount approved automatically without human signature.
- **`policy.min_savings`**: Minimum savings required to authorize an action.
- **`policy.human_approval_required_above`**: Transaction ceiling above which human sign-off is mandated.
- **`policy.allowed_categories`**: Array of authorized procurement categories.
- **`policy.category_budgets`**: Optional cumulative budget limits per category.

Returns `decision`: `"approved" | "needs_human" | "rejected"`, along with detailed rule checks and plain-text audit reasons.

### `computeIdempotencyKey(fields): string`

Computes a deterministic, collision-resistant SHA-256 hex key for transaction tracking:
`sha256(businessId | contractId | negotiationId | amount)`

## License

MIT © [Tavryn](https://github.com/pvanfas/tavryn)
