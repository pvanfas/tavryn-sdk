import { describe, expect, it } from "vitest";
import {
  canonicalizeDecisionPayload,
  computeEscrowDecisionHash,
  EscrowDecisionInput,
} from "../src/index";

describe("decision-hash - On-Chain Escrow Decision Canonicalization & Hashing", () => {
  const baseInput: EscrowDecisionInput = {
    businessId: "biz-test-01",
    contractId: "contract-123",
    negotiationId: "neg-456",
    vendorWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    amount: 6912,
    baselinePrice: 9600,
    category: "software",
    policyDecision: "approved",
    reviewerVerdict: "AGREE",
  };

  it("produces deterministic canonical JSON with sorted keys and lowercase addresses", () => {
    const canonical = canonicalizeDecisionPayload(baseInput);

    // Verify alphabetical key ordering
    const parsed = JSON.parse(canonical);
    const keys = Object.keys(parsed);
    const sortedKeys = [...keys].sort();
    expect(keys).toEqual(sortedKeys);

    // Verify 6-decimal USDC precision
    expect(parsed.amount).toBe("6912.000000");
    expect(parsed.baselinePrice).toBe("9600.000000");

    // Verify normalized lowercase address
    expect(parsed.vendorWallet).toBe(
      "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    );
  });

  it("produces exact 32-byte keccak256 hash starting with 0x", () => {
    const hash = computeEscrowDecisionHash(baseInput);

    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("produces identical hashes for identical inputs regardless of casing", () => {
    const inputMixedCasing: EscrowDecisionInput = {
      ...baseInput,
      vendorWallet: "0x70997970C51812DC3A010C7D01B50E0D17DC79C8",
    };

    const hash1 = computeEscrowDecisionHash(baseInput);
    const hash2 = computeEscrowDecisionHash(inputMixedCasing);

    expect(hash1).toBe(hash2);
  });

  it("produces distinct hashes for different amounts or entities", () => {
    const hash1 = computeEscrowDecisionHash(baseInput);
    const hash2 = computeEscrowDecisionHash({
      ...baseInput,
      amount: 6912.01,
    });
    const hash3 = computeEscrowDecisionHash({
      ...baseInput,
      businessId: "biz-test-02",
    });

    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });
});
