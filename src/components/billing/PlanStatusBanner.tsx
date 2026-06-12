import { Link } from "react-router-dom";
import { AlertTriangle, Clock, Lock } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";

export function PlanStatusBanner() {
  const { plan, isTrialing, trialDaysLeft, isLocked, rawStatus } = usePlan();

  if (!plan) return null;

  if (isLocked) {
    const reason =
      rawStatus === "canceled"
        ? "Sua assinatura foi cancelada."
        : rawStatus === "past_due"
          ? "Pagamento pendente — sua assinatura está bloqueada."
          : "Seu período de avaliação terminou.";
    return (
      <div className="w-full bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-sm text-destructive flex items-center justify-center gap-2">
        <Lock className="h-4 w-4" />
        <span>{reason} O app está em modo somente leitura.</span>
        <Link to="/configuracoes?tab=billing" className="underline font-medium ml-2">
          Reativar
        </Link>
      </div>
    );
  }

  if (isTrialing) {
    const urgent = trialDaysLeft <= 3;
    return (
      <div
        className={`w-full px-4 py-2 text-sm flex items-center justify-center gap-2 border-b ${
          urgent
            ? "bg-orange-100 border-orange-300 text-orange-800"
            : "bg-primary/10 border-primary/30 text-primary"
        }`}
      >
        {urgent ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
        <span>
          Trial — {trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"} no plano{" "}
          {plan.name}.
        </span>
        <Link to="/configuracoes?tab=billing" className="underline font-medium ml-2">
          Assinar agora
        </Link>
      </div>
    );
  }

  return null;
}
