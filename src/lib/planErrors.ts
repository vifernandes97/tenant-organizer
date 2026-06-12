export type PlanErrorCode =
  | "PLAN_LIMIT_CLIENTS"
  | "PLAN_LIMIT_MEMBERS"
  | "PLAN_FEATURE_API"
  | "PLAN_LOCKED";

const PLAN_ERROR_EVENT = "approvee:plan-error";

export function dispatchPlanError(code: PlanErrorCode) {
  window.dispatchEvent(new CustomEvent(PLAN_ERROR_EVENT, { detail: { code } }));
}

export function onPlanError(handler: (code: PlanErrorCode) => void): () => void {
  const fn = (e: Event) => {
    const code = (e as CustomEvent).detail?.code as PlanErrorCode;
    if (code) handler(code);
  };
  window.addEventListener(PLAN_ERROR_EVENT, fn);
  return () => window.removeEventListener(PLAN_ERROR_EVENT, fn);
}

/**
 * Inspects an error from a Supabase mutation. If it's a plan-related error,
 * dispatches the global event and returns true (caller should suppress toast).
 */
export function maybeHandlePlanError(error: unknown): boolean {
  const msg = (error as any)?.message || "";
  const codes: PlanErrorCode[] = [
    "PLAN_LIMIT_CLIENTS",
    "PLAN_LIMIT_MEMBERS",
    "PLAN_FEATURE_API",
    "PLAN_LOCKED",
  ];
  for (const code of codes) {
    if (typeof msg === "string" && msg.includes(code)) {
      dispatchPlanError(code);
      return true;
    }
  }
  return false;
}
