import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { usePlan, usePlansCatalog, type PlanCode } from "@/hooks/usePlan";
import { isPaymentsConfigured, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StripeEmbeddedCheckoutInline } from "./StripeEmbeddedCheckout";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatLimit(v: number | null) {
  return v === null ? "Ilimitado" : v.toString();
}

const FEATURE_LABELS: Record<string, string> = {
  api_access: "Acesso à API & MCP",
  white_label: "White label",
};

export function BillingPanel() {
  const { plan, isLocked, isTrialing, trialDaysLeft, usage, isOwner } = usePlan();
  const { data: plans = [] } = usePlansCatalog();
  const [checkoutPlan, setCheckoutPlan] = useState<PlanCode | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plano e Cobrança</CardTitle>
          <CardDescription>Apenas o proprietário da organização pode gerenciar.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const openPortal = async () => {
    if (!isPaymentsConfigured()) {
      toast.error("Pagamentos não configurados neste ambiente");
      return;
    }
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: {
          environment: getStripeEnvironment(),
          return_url: `${window.location.origin}/configuracoes?tab=billing`,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.url) throw new Error("URL do portal não retornada");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao abrir portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const startCheckout = (code: PlanCode) => {
    if (!isPaymentsConfigured()) {
      toast.error("Pagamentos não configurados neste ambiente");
      return;
    }
    setCheckoutPlan(code);
  };

  const clientsPct =
    usage.clients.limit === null ? 0 : Math.min(100, (usage.clients.used / usage.clients.limit) * 100);
  const membersPct =
    usage.members.limit === null ? 0 : Math.min(100, (usage.members.used / usage.members.limit) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                Plano atual: {plan?.name ?? "—"}
                {plan?.planOverride && <Badge variant="secondary">Plano interno</Badge>}
                {isTrialing && <Badge>Trial — {trialDaysLeft}d restantes</Badge>}
                {isLocked && <Badge variant="destructive">Bloqueado</Badge>}
              </CardTitle>
              <CardDescription>
                {plan?.currentPeriodEnd
                  ? `Renova em ${new Date(plan.currentPeriodEnd).toLocaleDateString("pt-BR")}`
                  : isTrialing && plan?.trialEndsAt
                    ? `Trial termina em ${new Date(plan.trialEndsAt).toLocaleDateString("pt-BR")}`
                    : "Sem cobrança recorrente ativa"}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={openPortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
              Gerenciar assinatura
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Clientes ativos</span>
              <span className="text-muted-foreground">
                {usage.clients.used} / {formatLimit(usage.clients.limit)}
              </span>
            </div>
            <Progress value={clientsPct} />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Membros (incluindo convites pendentes)</span>
              <span className="text-muted-foreground">
                {usage.members.used} / {formatLimit(usage.members.limit)}
              </span>
            </div>
            <Progress value={membersPct} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = plan?.code === p.code;
          const features = (p.features as Record<string, boolean>) ?? {};
          return (
            <Card key={p.id} className={isCurrent ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{p.name}</CardTitle>
                  {isCurrent && <Badge>Atual</Badge>}
                </div>
                <CardDescription className="text-2xl font-bold text-foreground">
                  {formatBRL(p.price_cents)}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {formatLimit(p.max_active_clients)} clientes ativos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {formatLimit(p.max_members)} membros
                  </li>
                  {Object.entries(features).map(([k, v]) =>
                    v ? (
                      <li key={k} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        {FEATURE_LABELS[k] ?? k}
                      </li>
                    ) : null,
                  )}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || !!plan?.planOverride}
                  onClick={() => startCheckout(p.code as PlanCode)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isCurrent ? "Plano atual" : "Assinar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {plan?.planOverride && (
        <p className="text-xs text-muted-foreground text-center">
          Esta organização está em modo de plano interno e não passa por cobrança automática.
        </p>
      )}

      <Dialog open={!!checkoutPlan} onOpenChange={(o) => !o && setCheckoutPlan(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Finalizar assinatura</DialogTitle>
          </DialogHeader>
          {checkoutPlan && (
            <StripeEmbeddedCheckoutInline
              planCode={checkoutPlan}
              returnUrl={`${window.location.origin}/configuracoes?tab=billing&checkout=success&session_id={CHECKOUT_SESSION_ID}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
