import { describe, expect, it } from "vitest";
import {
  checkPolicy,
  computeIdempotencyKey,
  Policy,
  Context,
} from "../src/index";

const basePolicy: Policy = {
  max_auto_transaction: 2000,
  min_savings: 200,
  human_approval_required_above: 2000,
  allowed_categories: ["software", "cloud", "contractors"],
  category_budgets: {
    software: 10000,
    cloud: 25000,
  },
};

describe("checkPolicy - Deterministic Spending Policy Engine", () => {
  describe("Threshold amounts", () => {
    it("approves automatically when amount is within autonomous ceiling and meets savings", () => {
      const context: Context = {
        amount: 1500,
        savings: 500,
        category: "software",
        treasuryBalance: 50000,
      };

      const result = checkPolicy("execute", basePolicy, context);
      expect(result.decision).toBe("approved");
      expect(result.approved).toBe(true);
      expect(result.requiresHumanApproval).toBe(false);
      expect(result.checks.every((c) => c.passed)).toBe(true);
    });

    it("requires human approval when amount exceeds autonomous transaction ceiling", () => {
      const context: Context = {
        amount: 2500,
        savings: 600,
        category: "software",
        treasuryBalance: 50000,
      };

      const result = checkPolicy("execute", basePolicy, context);
      expect(result.decision).toBe("needs_human");
      expect(result.approved).toBe(false);
      expect(result.requiresHumanApproval).toBe(true);
      expect(result.reasons.some((r) => r.includes("autonomous transaction ceiling"))).toBe(true);
    });

    it("requires human approval when amount exceeds human_approval_required_above", () => {
      const customPolicy: Policy = {
        ...basePolicy,
        max_auto_transaction: 5000,
        human_approval_required_above: 3000,
      };

      const context: Context = {
        amount: 3500,
        savings: 700,
        category: "software",
        treasuryBalance: 50000,
      };

      const result = checkPolicy(customPolicy, context);
      expect(result.decision).toBe("needs_human");
      expect(result.requiresHumanApproval).toBe(true);
    });
  });

  describe("Zero savings & savings thresholds", () => {
    it("rejects when projected savings is zero and minimum savings is required", () => {
      const context: Context = {
        amount: 1000,
        savings: 0,
        category: "software",
        treasuryBalance: 50000,
      };

      const result = checkPolicy("execute", basePolicy, context);
      expect(result.decision).toBe("rejected");
      expect(result.approved).toBe(false);
      expect(result.reasons.some((r) => r.includes("minimum policy threshold"))).toBe(true);
    });

    it("escalates to human approval instead of rejection when allowHumanOverrideOnLowSavings is enabled", () => {
      const context: Context = {
        amount: 1000,
        savings: 50,
        category: "software",
        treasuryBalance: 50000,
        allowHumanOverrideOnLowSavings: true,
      };

      const result = checkPolicy("execute", basePolicy, context);
      expect(result.decision).toBe("needs_human");
      expect(result.requiresHumanApproval).toBe(true);
    });
  });

  describe("Category budget tracking", () => {
    it("escalates when prior spend + amount exceeds category budget", () => {
      const context: Context = {
        amount: 1500,
        savings: 300,
        category: "software", // budget is 10,000
        currentPeriodSpent: 9000, // 9000 + 1500 = 10,500 > 10,000
        treasuryBalance: 50000,
      };

      const result = checkPolicy("execute", basePolicy, context);
      expect(result.decision).toBe("needs_human");
      expect(result.reasons.some((r) => r.includes("Cumulative category spend"))).toBe(true);
    });

    it("rejects immediately if a single transaction amount exceeds the entire category budget", () => {
      const context: Context = {
        amount: 12000,
        savings: 2000,
        category: "software", // budget is 10,000
        treasuryBalance: 50000,
      };

      const result = checkPolicy("execute", basePolicy, context);
      expect(result.decision).toBe("rejected");
      expect(result.approved).toBe(false);
    });

    it("passes when no category budget is configured for that category", () => {
      const context: Context = {
        amount: 1500,
        savings: 300,
        category: "contractors", // allowed but no budget defined in basePolicy
        currentPeriodSpent: 20000,
        treasuryBalance: 50000,
      };

      const result = checkPolicy("execute", basePolicy, context);
      expect(result.decision).toBe("approved");
    });
  });

  describe("Insufficient balance & treasury checks", () => {
    it("rejects when transaction amount exceeds current treasury balance", () => {
      const context: Context = {
        amount: 1500,
        savings: 400,
        category: "software",
        treasuryBalance: 1000, // less than 1500
      };

      const result = checkPolicy("execute", basePolicy, context);
      expect(result.decision).toBe("rejected");
      expect(result.approved).toBe(false);
      expect(result.reasons.some((r) => r.includes("Insufficient treasury balance"))).toBe(true);
    });
  });

  describe("Disallowed categories and input validation", () => {
    it("rejects transactions for categories not in allowed_categories", () => {
      const context: Context = {
        amount: 500,
        savings: 300,
        category: "entertainment", // not in allowed
        treasuryBalance: 50000,
      };

      const result = checkPolicy("execute", basePolicy, context);
      expect(result.decision).toBe("rejected");
      expect(result.reasons.some((r) => r.includes("not in allowed categories"))).toBe(true);
    });

    it("rejects negative numbers strictly", () => {
      const context: Context = {
        amount: -500,
        savings: 300,
        category: "software",
      };

      const result = checkPolicy("execute", basePolicy, context);
      expect(result.decision).toBe("rejected");
      expect(result.reasons.some((r) => r.includes("Negative or invalid numeric amounts"))).toBe(true);
    });
  });
});

describe("computeIdempotencyKey", () => {
  it("produces identical SHA-256 hash for identical input fields", () => {
    const fieldsA = {
      businessId: "biz-123",
      contractId: "contract-456",
      negotiationId: "neg-789",
      amount: 1500,
    };
    const fieldsB = {
      businessId: "biz-123",
      contractId: "contract-456",
      negotiationId: "neg-789",
      amount: 1500,
    };

    const keyA = computeIdempotencyKey(fieldsA);
    const keyB = computeIdempotencyKey(fieldsB);

    expect(keyA).toBe(keyB);
    expect(keyA).toHaveLength(64); // SHA-256 hex string
  });

  it("produces completely distinct hashes for different amounts or entities", () => {
    const key1 = computeIdempotencyKey({
      businessId: "biz-123",
      contractId: "contract-456",
      amount: 1500,
    });
    const key2 = computeIdempotencyKey({
      businessId: "biz-123",
      contractId: "contract-456",
      amount: 1501, // $1 difference
    });
    const key3 = computeIdempotencyKey({
      businessId: "biz-999",
      contractId: "contract-456",
      amount: 1500,
    });

    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
  });

  it("gracefully handles null or omitted optional fields without error", () => {
    const key = computeIdempotencyKey({
      businessId: "biz-123",
      amount: "2500.50",
    });
    expect(key).toHaveLength(64);
  });
});
