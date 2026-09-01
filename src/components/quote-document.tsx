import { Sparkles } from "lucide-react";
import type { Quote, QuoteTotals } from "@/lib/quote-types";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand brand--compact" : "brand"} aria-label="Constellation">
      <span className="brand-mark" aria-hidden="true"><span>✦</span></span>
      <span className="brand-wording">
        <strong>CONSTELLATION</strong>
        {!compact && <small>Studio de devis</small>}
      </span>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

type QuoteDocumentProps = {
  quote: Quote;
  totals: QuoteTotals;
  money: Intl.NumberFormat;
  variant?: "desktop" | "readable" | "a4";
};

export function QuoteDocument({
  quote,
  totals,
  money,
  variant = "desktop",
}: QuoteDocumentProps) {
  return (
    <article className={`quote-page quote-page--${variant}`}>
      <div className="quote-accent" />
      <header className="quote-header">
        <BrandLogo compact />
        <div className="quote-meta">
          <span className="quote-status">{quote.status}</span>
          <strong>{quote.quoteNumber}</strong>
          <small>Émis le {formatDate(quote.issueDate)}</small>
        </div>
      </header>

      <section className="quote-hero">
        <span className="quote-kicker">PROPOSITION COMMERCIALE</span>
        <h2>{quote.title || "Votre proposition"}</h2>
        <p>{quote.introduction}</p>
      </section>

      <section className="quote-parties">
        <div>
          <span>PRÉPARÉ POUR</span>
          <strong>{quote.client.company || "Nom du client"}</strong>
          <p>{quote.client.name}</p>
          <p>{quote.client.email}</p>
          <p>{quote.client.phone}</p>
          <p>{quote.client.address}</p>
        </div>
        <div>
          <span>VALABLE JUSQU’AU</span>
          <strong>{formatDate(quote.validUntil)}</strong>
          <p>Une fenêtre claire pour décider sereinement.</p>
        </div>
      </section>

      <section className="quote-lines">
        <div className="quote-table-head">
          <span>DESCRIPTION</span><span>QTÉ</span><span>PRIX</span><span>TOTAL</span>
        </div>
        {quote.items.map((item) => (
          <div className="quote-line" key={item.id}>
            <div>
              <strong>{item.description || "Prestation"}</strong>
              <p>{item.details}</p>
            </div>
            <span className="quote-line-quantity"><small>Qté</small>{item.quantity}</span>
            <span className="quote-line-price"><small>Prix</small>{money.format(item.unitPrice)}</span>
            <strong className="quote-line-total"><small>Total</small>{money.format(item.quantity * item.unitPrice)}</strong>
          </div>
        ))}
      </section>

      <section className="quote-summary">
        <div className="quote-note">
          <span>CONDITIONS</span>
          <p>{quote.paymentTerms}</p>
          {quote.deposit > 0 && (
            <div className="deposit-note">
              <Sparkles size={15} aria-hidden="true" />
              <span>Acompte à la validation : <strong>{money.format(totals.depositAmount)}</strong></span>
            </div>
          )}
        </div>
        <div className="totals-table">
          <p><span>Sous-total</span><strong>{money.format(totals.subtotal)}</strong></p>
          {quote.discount > 0 && <p><span>Remise ({quote.discount}%)</span><strong>− {money.format(totals.discountAmount)}</strong></p>}
          {quote.tax > 0 && <p><span>Taxe / TVA ({quote.tax}%)</span><strong>{money.format(totals.taxAmount)}</strong></p>}
          <div><span>TOTAL</span><strong>{money.format(totals.total)}</strong></div>
        </div>
      </section>

      <section className="quote-terms"><span>NOTES</span><p>{quote.notes}</p></section>

      <footer className="quote-footer">
        <BrandLogo compact />
        <div><strong>{quote.sender.name}</strong><span>{quote.sender.email}</span><span>{quote.sender.phone}</span></div>
        <div><strong>{quote.sender.address}</strong><span>{quote.sender.taxId}</span></div>
      </footer>
    </article>
  );
}
