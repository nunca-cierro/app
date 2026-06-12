/* ------------------------------------------------------------------ */
/*  Billing types — 1:1 con BillingInfoResponse del backend           */
/* ------------------------------------------------------------------ */

export interface PaymentMethod {
  name: string;
  number: string;
  logo: string;
}

export interface PaymentInfo {
  qr_urls: Record<string, string>;
  methods: PaymentMethod[];
  account_holder: string;
}

export interface PlanInfo {
  key: string;
  label: string;
  price: number;
  priceLabel: string;
  features: string[];
}
