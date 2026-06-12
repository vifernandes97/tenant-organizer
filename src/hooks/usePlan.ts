import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlanCode = "starter" | "agencia" | "pro";
export type EffectiveStatus = "trialing" | "active" | "past_due" | "canceled" | "locked";

export interface PlanInfo {
  planId: string;
  code: PlanCode;
  name: string;
  features: Record<string, boolean>;
  maxActiveClients: number | null;
  maxMembers: number | null;
  status: EffectiveStatus;
  rawStatus: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  planOverride: boolean;
}

export interface PlanUsage {
  clients: { used: number; limit: number | null };
  members: { used: number; limit: number | null };
}

export function usePlan() {
  const { profile, userRole } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const isOwner = userRole?.role === "owner";

  const planQuery = useQuery({
    queryKey: ["plan", tenantId],
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: async (): Promise<PlanInfo | null> => {
      const { data, error } = await supabase.rpc("get_tenant_subscription", {
        _tenant_id: tenantId!,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        planId: row.plan_id,
        code: row.plan_code as PlanCode,
        name: row.plan_name,
        features: (row.features ?? {}) as Record<string, boolean>,
        maxActiveClients: row.max_active_clients,
        maxMembers: row.max_members,
        status: row.effective_status as EffectiveStatus,
        rawStatus: row.raw_status,
        trialEndsAt: row.trial_ends_at,
        currentPeriodEnd: row.current_period_end,
        planOverride: row.plan_override,
      };
    },
  });

  const usageQuery = useQuery({
    queryKey: ["plan-usage", tenantId],
    enabled: !!tenantId,
    staleTime: 15_000,
    queryFn: async (): Promise<PlanUsage> => {
      const [clientsResult, rolesResult, invitesResult] = await Promise.all([
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("user_roles")
          .select("user_id", { count: "exact", head: true }),
        supabase
          .from("invitations")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      return {
        clients: { used: clientsResult.count ?? 0, limit: planQuery.data?.maxActiveClients ?? null },
        members: {
          used: (rolesResult.count ?? 0) + (invitesResult.count ?? 0),
          limit: planQuery.data?.maxMembers ?? null,
        },
      };
    },
  });

  return useMemo(() => {
    const plan = planQuery.data ?? null;
    const status = plan?.status ?? "locked";
    const isLocked = status === "locked";
    const isTrialing = status === "trialing";
    const trialDaysLeft = plan?.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(plan.trialEndsAt).getTime() - Date.now()) / 86400000))
      : 0;

    const usage: PlanUsage = usageQuery.data ?? {
      clients: { used: 0, limit: plan?.maxActiveClients ?? null },
      members: { used: 0, limit: plan?.maxMembers ?? null },
    };

    const canCreateClient = !isLocked && (usage.clients.limit === null || usage.clients.used < usage.clients.limit);
    const canInviteMember = !isLocked && (usage.members.limit === null || usage.members.used < usage.members.limit);
    const hasFeature = (name: string) => !isLocked && !!plan?.features?.[name];

    return {
      plan,
      status,
      rawStatus: plan?.rawStatus ?? null,
      isLocked,
      isTrialing,
      trialDaysLeft,
      usage,
      canCreateClient,
      canInviteMember,
      hasFeature,
      isOwner,
      isLoading: planQuery.isLoading || usageQuery.isLoading,
    };
  }, [planQuery.data, usageQuery.data, planQuery.isLoading, usageQuery.isLoading, isOwner]);
}

export function usePlansCatalog() {
  return useQuery({
    queryKey: ["plans-catalog"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });
}
