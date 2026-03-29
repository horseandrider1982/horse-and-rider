import { useQuery } from "@tanstack/react-query";
import { storefrontApiRequest } from "@/lib/shopify";

const SHOP_PAYMENT_QUERY = `
  query {
    shop {
      paymentSettings {
        acceptedCardBrands
        supportedDigitalWallets
      }
    }
  }
`;

type CardBrand = "VISA" | "MASTERCARD" | "AMERICAN_EXPRESS" | "DISCOVER" | "JCB" | "DINERS_CLUB";
type DigitalWallet = "APPLE_PAY" | "GOOGLE_PAY" | "SHOPIFY_PAY" | "AMAZON_PAY";

const CARD_ICONS: Record<string, { label: string; svg: JSX.Element }> = {
  VISA: {
    label: "Visa",
    svg: (
      <svg viewBox="0 0 48 32" className="h-full w-full">
        <rect width="48" height="32" rx="4" fill="#1A1F71" />
        <text x="24" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif" fontStyle="italic">VISA</text>
      </svg>
    ),
  },
  MASTERCARD: {
    label: "Mastercard",
    svg: (
      <svg viewBox="0 0 48 32" className="h-full w-full">
        <rect width="48" height="32" rx="4" fill="#252525" />
        <circle cx="19" cy="16" r="9" fill="#EB001B" />
        <circle cx="29" cy="16" r="9" fill="#F79E1B" />
        <path d="M24 9.07a9 9 0 0 1 0 13.86 9 9 0 0 1 0-13.86Z" fill="#FF5F00" />
      </svg>
    ),
  },
  AMERICAN_EXPRESS: {
    label: "American Express",
    svg: (
      <svg viewBox="0 0 48 32" className="h-full w-full">
        <rect width="48" height="32" rx="4" fill="#006FCF" />
        <text x="24" y="18" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="Arial, sans-serif">AMEX</text>
      </svg>
    ),
  },
  DISCOVER: {
    label: "Discover",
    svg: (
      <svg viewBox="0 0 48 32" className="h-full w-full">
        <rect width="48" height="32" rx="4" fill="#FF6000" />
        <text x="24" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">DISCOVER</text>
      </svg>
    ),
  },
  JCB: {
    label: "JCB",
    svg: (
      <svg viewBox="0 0 48 32" className="h-full w-full">
        <rect width="48" height="32" rx="4" fill="#0E4C96" />
        <text x="24" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold" fontFamily="Arial, sans-serif">JCB</text>
      </svg>
    ),
  },
  DINERS_CLUB: {
    label: "Diners Club",
    svg: (
      <svg viewBox="0 0 48 32" className="h-full w-full">
        <rect width="48" height="32" rx="4" fill="#0079BE" />
        <text x="24" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="Arial, sans-serif">DINERS</text>
      </svg>
    ),
  },
};

const WALLET_ICONS: Record<string, { label: string; svg: JSX.Element }> = {
  APPLE_PAY: {
    label: "Apple Pay",
    svg: (
      <svg viewBox="0 0 48 32" className="h-full w-full">
        <rect width="48" height="32" rx="4" fill="#000000" />
        <text x="24" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="500" fontFamily="Arial, sans-serif"> Pay</text>
      </svg>
    ),
  },
  GOOGLE_PAY: {
    label: "Google Pay",
    svg: (
      <svg viewBox="0 0 48 32" className="h-full w-full">
        <rect width="48" height="32" rx="4" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="0.5" />
        <text x="24" y="19" textAnchor="middle" fill="#5F6368" fontSize="7" fontWeight="500" fontFamily="Arial, sans-serif">G Pay</text>
      </svg>
    ),
  },
  SHOPIFY_PAY: {
    label: "Shop Pay",
    svg: (
      <svg viewBox="0 0 48 32" className="h-full w-full">
        <rect width="48" height="32" rx="4" fill="#5A31F4" />
        <text x="24" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="Arial, sans-serif">Shop Pay</text>
      </svg>
    ),
  },
  AMAZON_PAY: {
    label: "Amazon Pay",
    svg: (
      <svg viewBox="0 0 48 32" className="h-full w-full">
        <rect width="48" height="32" rx="4" fill="#232F3E" />
        <text x="24" y="19" textAnchor="middle" fill="#FF9900" fontSize="7" fontWeight="bold" fontFamily="Arial, sans-serif">amazon</text>
      </svg>
    ),
  },
};

// PayPal & Klarna are common Shopify payment providers but not returned via paymentSettings
// We show them as static icons since they're configured as payment gateways
const EXTRA_ICONS: Array<{ key: string; label: string; svg: JSX.Element }> = [
  {
    key: "paypal",
    label: "PayPal",
    svg: (
      <svg viewBox="0 0 48 32" className="h-full w-full">
        <rect width="48" height="32" rx="4" fill="#003087" />
        <text x="24" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">PayPal</text>
      </svg>
    ),
  },
  {
    key: "klarna",
    label: "Klarna",
    svg: (
      <svg viewBox="0 0 48 32" className="h-full w-full">
        <rect width="48" height="32" rx="4" fill="#FFB3C7" />
        <text x="24" y="19" textAnchor="middle" fill="#0A0B09" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">Klarna</text>
      </svg>
    ),
  },
];

function useShopPaymentMethods() {
  return useQuery({
    queryKey: ["shopify-payment-methods"],
    queryFn: async () => {
      const data = await storefrontApiRequest(SHOP_PAYMENT_QUERY);
      const settings = data?.data?.shop?.paymentSettings;
      return {
        cards: (settings?.acceptedCardBrands || []) as CardBrand[],
        wallets: (settings?.supportedDigitalWallets || []) as DigitalWallet[],
      };
    },
    staleTime: 1000 * 60 * 60, // 1h
  });
}

export function PaymentIcons() {
  const { data } = useShopPaymentMethods();

  if (!data) return null;

  const icons: Array<{ key: string; label: string; svg: JSX.Element }> = [];

  data.cards.forEach((brand) => {
    const icon = CARD_ICONS[brand];
    if (icon) icons.push({ key: brand, ...icon });
  });

  data.wallets.forEach((wallet) => {
    const icon = WALLET_ICONS[wallet];
    if (icon) icons.push({ key: wallet, ...icon });
  });

  icons.push(...EXTRA_ICONS);

  if (icons.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      {icons.map(({ key, label, svg }) => (
        <div
          key={key}
          className="h-7 w-11 rounded-sm overflow-hidden shadow-sm border border-border/50"
          title={label}
        >
          {svg}
        </div>
      ))}
    </div>
  );
}
