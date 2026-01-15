import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ClientStatusBadge } from "./ClientStatusBadge";
import { ChannelBadges } from "./ChannelBadges";
import {
  Pencil,
  Mail,
  Phone,
  User,
  Building2,
  MessageSquare,
  Target,
  Tag,
  Link as LinkIcon,
  FileText,
  ExternalLink,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

interface ClientDetailsProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: Client) => void;
}

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

export function ClientDetails({ client, open, onOpenChange, onEdit }: ClientDetailsProps) {
  if (!client) return null;

  const links = (client.important_links as { label: string; url: string }[]) || [];
  const tags = (client.tags as string[]) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-xl">{client.name}</SheetTitle>
              {client.segment && (
                <p className="text-sm text-muted-foreground">{client.segment}</p>
              )}
            </div>
            <ClientStatusBadge status={client.status} />
          </div>
        </SheetHeader>

        <div className="flex gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onEdit(client);
              onOpenChange(false);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>

        <div className="space-y-6">
          {client.description && (
            <DetailSection icon={Building2} title="Descrição">
              <p className="text-sm">{client.description}</p>
            </DetailSection>
          )}

          {(client.contact_name || client.contact_email || client.contact_phone) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Contato
                </h3>
                {client.contact_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{client.contact_name}</span>
                  </div>
                )}
                {client.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${client.contact_email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {client.contact_email}
                    </a>
                  </div>
                )}
                {client.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${client.contact_phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {client.contact_phone}
                    </a>
                  </div>
                )}
              </div>
            </>
          )}

          {(client.channels && client.channels.length > 0) && (
            <>
              <Separator />
              <DetailSection icon={MessageSquare} title="Canais">
                <ChannelBadges channels={client.channels} size="md" />
              </DetailSection>
            </>
          )}

          {client.persona && (
            <>
              <Separator />
              <DetailSection icon={Target} title="Persona">
                <p className="text-sm whitespace-pre-wrap">{client.persona}</p>
              </DetailSection>
            </>
          )}

          {client.tone_of_voice && (
            <>
              <Separator />
              <DetailSection icon={MessageSquare} title="Tom de voz">
                <p className="text-sm whitespace-pre-wrap">{client.tone_of_voice}</p>
              </DetailSection>
            </>
          )}

          {tags.length > 0 && (
            <>
              <Separator />
              <DetailSection icon={Tag} title="Tags">
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-muted rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </DetailSection>
            </>
          )}

          {links.length > 0 && (
            <>
              <Separator />
              <DetailSection icon={LinkIcon} title="Links importantes">
                <div className="space-y-2">
                  {links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.label}
                    </a>
                  ))}
                </div>
              </DetailSection>
            </>
          )}

          {client.notes && (
            <>
              <Separator />
              <DetailSection icon={FileText} title="Notas">
                <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
              </DetailSection>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
