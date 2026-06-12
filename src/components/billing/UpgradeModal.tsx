import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { onPlanError, type PlanErrorCode } from "@/lib/planErrors";

const COPY: Record<PlanErrorCode, { title: string; description: string }> = {
  PLAN_LIMIT_CLIENTS: {
    title: "Limite de clientes atingido",
    description:
      "Seu plano atual não permite mais clientes ativos. Faça upgrade para adicionar mais ou arquive um cliente existente.",
  },
  PLAN_LIMIT_MEMBERS: {
    title: "Limite de membros atingido",
    description:
      "Seu plano atual não permite mais membros (ou convites pendentes). Faça upgrade ou cancele um convite pendente.",
  },
  PLAN_FEATURE_API: {
    title: "Recurso indisponível no seu plano",
    description:
      "Tokens de API estão disponíveis nos planos Agência e Pro. Faça upgrade para integrar com sistemas externos.",
  },
  PLAN_LOCKED: {
    title: "Acesso somente leitura",
    description:
      "Sua organização está em modo somente leitura (trial expirado, pagamento pendente ou assinatura cancelada). Reative seu plano para voltar a criar e editar.",
  },
};

export function UpgradeModal() {
  const [code, setCode] = useState<PlanErrorCode | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return onPlanError((c) => setCode(c));
  }, []);

  const open = code !== null;
  const copy = code ? COPY[code] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setCode(null)}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {code === "PLAN_LOCKED" ? (
              <Lock className="h-5 w-5 text-destructive" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary" />
            )}
            <DialogTitle>{copy?.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{copy?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCode(null)}>
            Fechar
          </Button>
          <Button
            onClick={() => {
              setCode(null);
              navigate("/configuracoes?tab=billing");
            }}
          >
            Ver planos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
