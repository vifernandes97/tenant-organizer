import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useMemo } from "react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  planCode: "starter" | "agencia" | "pro";
  returnUrl: string;
}

export function StripeEmbeddedCheckoutInline({ planCode, returnUrl }: Props) {
  const stripePromise = useMemo(() => getStripe(), []);
  const options = useMemo(
    () => ({
      fetchClientSecret: async (): Promise<string> => {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { plan_code: planCode, return_url: returnUrl, environment: getStripeEnvironment() },
        });
        if (error || !data?.clientSecret) {
          throw new Error(error?.message || "Erro ao iniciar checkout");
        }
        return data.clientSecret;
      },
    }),
    [planCode, returnUrl],
  );

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
