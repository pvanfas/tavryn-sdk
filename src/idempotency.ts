import crypto from "crypto";

export interface IdempotencyFields {
  businessId: string;
  contractId?: string | null;
  negotiationId?: string | null;
  amount: number | string;
}

/**
 * Computes a deterministic SHA-256 idempotency key:
 * sha256(business_id | contract_id | negotiation_id | amount)
 *
 * Ensures no action or escrow payment is ever executed twice for the same entity context.
 */
export function computeIdempotencyKey(fields: IdempotencyFields): string {
  const payload = `${fields.businessId}|${fields.contractId || ""}|${fields.negotiationId || ""}|${fields.amount}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Alias for computeIdempotencyKey matching Tavryn core tools.
 */
export const computeEscrowIdempotencyKey = computeIdempotencyKey;
