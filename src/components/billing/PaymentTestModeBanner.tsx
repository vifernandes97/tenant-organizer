const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) return null;
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-1.5 text-center text-xs text-orange-800">
        Pagamentos em modo teste — use o cartão 4242 4242 4242 4242.
      </div>
    );
  }
  return null;
}
