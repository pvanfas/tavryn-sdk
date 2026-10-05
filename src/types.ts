export interface Policy {
  id?: string;
  business_id?: string;
  max_auto_transaction: number;
  min_savings: number;
  human_approval_required_above: number;
  allowed_categories: string[];
  category_budgets?: Record<string, number> | null;
}

export type PolicyRule = Policy;

export type Action = "execute" | "negotiate" | "escrow" | "release" | string;

export interface Context {
  action?: Action;
  amount: number;
  savings?: number;
  category: string;
  treasuryBalance?: number;
  currentPeriodSpent?: number;
  allowHumanOverrideOnLowSavings?: boolean;
  contract_id?: string;
  contractId?: string;
  vendor_id?: string;
  negotiationId?: string;
  upcomingObligations30d?: number;
  daysUntilRenewal?: number;
  monthlyBurnRate?: number;
}

export type PolicyContext = Context;

export type PolicyDecision = "approved" | "needs_human" | "rejected";

export interface PolicyCheckItem {
  name: string;
  passed: boolean;
  detail: string;
}

export interface RunwayAnalysis {
  treasuryBalance: number;
  transactionAmount: number;
  projectedLiquidity: number;
  upcomingObligations30d: number;
  daysUntilRenewal: number;
  hasSufficientRunway: boolean;
  recommendation: "execute_now" | "schedule_deferred" | "escalate_low_runway";
}

export interface PolicyResult {
  decision: PolicyDecision;
  checks: PolicyCheckItem[];
  reasons: string[];
  approved: boolean;
  requiresHumanApproval: boolean;
  runwayAnalysis?: RunwayAnalysis;
}

export type PolicyEvaluation = PolicyResult;
