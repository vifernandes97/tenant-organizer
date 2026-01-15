import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type ClientStatus = Database["public"]["Enums"]["client_status"];

interface ClientStatusBadgeProps {
  status: ClientStatus;
}

export function ClientStatusBadge({ status }: ClientStatusBadgeProps) {
  if (status === "active") {
    return (
      <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
        Ativo
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="bg-muted text-muted-foreground">
      Pausado
    </Badge>
  );
}
