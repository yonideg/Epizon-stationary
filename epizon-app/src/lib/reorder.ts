export type ReorderPriority =
  | "CRITICAL"
  | "HIGH"
  | "NORMAL"
  | "SLOW_MOVING"
  | "INSUFFICIENT_DATA";

export interface ReorderInput {
  currentStock: number;
  unitsSoldInPeriod: number;
  periodDays: number;
  reorderThreshold: number;
  leadTimeDays: number;
  safetyStockDays: number;
  incomingConfirmedQty?: number;
  reviewCoverageDays?: number;
}

export interface ReorderResult {
  averageDailyDemand: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  daysOfStockRemaining: number | null;
  priority: ReorderPriority;
}

export function calculateReorder(input: ReorderInput): ReorderResult {
  const {
    currentStock,
    unitsSoldInPeriod,
    periodDays,
    reorderThreshold,
    leadTimeDays,
    safetyStockDays,
    incomingConfirmedQty = 0,
    reviewCoverageDays = leadTimeDays,
  } = input;

  if (periodDays <= 0) {
    return {
      averageDailyDemand: 0,
      reorderPoint: reorderThreshold,
      suggestedOrderQty: Math.max(0, reorderThreshold - currentStock),
      daysOfStockRemaining: null,
      priority: "INSUFFICIENT_DATA",
    };
  }

  const averageDailyDemand = unitsSoldInPeriod / periodDays;
  const safetyStock = averageDailyDemand * safetyStockDays;
  const reorderPoint = averageDailyDemand * leadTimeDays + safetyStock;

  const targetStock =
    averageDailyDemand * (leadTimeDays + reviewCoverageDays) + safetyStock;
  const suggestedOrderQty = Math.max(
    0,
    Math.ceil(targetStock - currentStock - incomingConfirmedQty),
  );

  const daysOfStockRemaining =
    averageDailyDemand > 0 ? currentStock / averageDailyDemand : null;

  let priority: ReorderPriority = "NORMAL";
  if (unitsSoldInPeriod === 0 && currentStock > reorderThreshold) {
    priority = "SLOW_MOVING";
  } else if (unitsSoldInPeriod === 0 && periodDays >= 30) {
    priority = "INSUFFICIENT_DATA";
  } else if (currentStock <= 0) {
    priority = "CRITICAL";
  } else if (
    daysOfStockRemaining !== null &&
    daysOfStockRemaining <= leadTimeDays
  ) {
    priority = "CRITICAL";
  } else if (currentStock <= reorderPoint || currentStock <= reorderThreshold) {
    priority = "HIGH";
  }

  return {
    averageDailyDemand,
    reorderPoint,
    suggestedOrderQty,
    daysOfStockRemaining,
    priority,
  };
}
