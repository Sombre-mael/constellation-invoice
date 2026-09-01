export type Currency = "USD" | "CDF" | "EUR";

export type QuoteStatus = "Brouillon" | "Prêt à envoyer" | "Envoyé" | "Accepté";

export type EditorSection = "client" | "prestations" | "conditions" | "emetteur";

export type MobilePreviewMode = "readable" | "a4";

export type StepDirection = -1 | 1;

export type Party = {
  company: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

export type LineItem = {
  id: string;
  description: string;
  details: string;
  quantity: number;
  unitPrice: number;
};

export type Quote = {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  issueDate: string;
  validUntil: string;
  currency: Currency;
  title: string;
  introduction: string;
  client: Party;
  sender: Party & { taxId: string };
  items: LineItem[];
  discount: number;
  tax: number;
  deposit: number;
  paymentTerms: string;
  notes: string;
  updatedAt: string;
};

export type QuoteTotals = {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  depositAmount: number;
};
