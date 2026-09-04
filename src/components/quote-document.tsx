import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { Quote, QuoteTotals } from "@/lib/quote-types";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand brand--compact" : "brand"}>
      <span className="brand-logo-frame">
        <Image
          src="/constellation-logo-clean.png"
          alt="Constellation"
          fill
          sizes={compact ? "108px" : "142px"}
          loading="eager"
        />
      </span>
    </div>
  );
}

function formatDate(value: string, style: "long" | "numeric" = "long") {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", style === "long"
    ? { day: "2-digit", month: "long", year: "numeric" }
    : { day: "2-digit", month: "2-digit", year: "numeric" })
    .format(new Date(`${value}T12:00:00`));
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

      <header className="quote-header quote-letterhead">
        <BrandLogo />
        <div className="quote-meta">
          <span className="quote-date">Le {formatDate(quote.issueDate, "numeric")}</span>
          <span className="quote-status">{quote.status}</span>
          <small>DEVIS N°</small>
          <strong>{quote.quoteNumber}</strong>
        </div>
      </header>

      <section className="quote-hero">
        <span className="quote-kicker">DEVIS</span>
        <h2>{quote.title || "Votre projet"}</h2>
        {quote.introduction && <p>{quote.introduction}</p>}
      </section>

      <section className="quote-parties">
        <div className="quote-client-card">
          <span>PRÉPARÉ POUR</span>
          <strong>{quote.client.company || "Nom du client"}</strong>
          {quote.client.name && <p>{quote.client.name}</p>}
          {quote.client.email && <p>{quote.client.email}</p>}
          {quote.client.phone && <p>{quote.client.phone}</p>}
          {quote.client.address && <p>{quote.client.address}</p>}
        </div>
        <div className="quote-validity-card">
          <span>CALENDRIER</span>
          <div><small>Émis le</small><strong>{formatDate(quote.issueDate)}</strong></div>
          <div><small>Valable jusqu’au</small><strong>{formatDate(quote.validUntil)}</strong></div>
        </div>
      </section>

      <section className="quote-lines" aria-label="Détail du devis">
        <div className="quote-table-head" aria-hidden="true">
          <span>N°</span><span>DÉSIGNATION</span><span>QUANTITÉ</span><span>PRIX UNITAIRE</span><span>PRIX TOTAL</span>
        </div>
        {quote.items.map((item, index) => (
          <div className="quote-line" key={item.id}>
            <span className="quote-line-index">{String(index + 1).padStart(2, "0")}</span>
            <div className="quote-line-description">
              <strong>{item.description || "Prestation"}</strong>
              {item.details && <p>{item.details}</p>}
            </div>
            <span className="quote-line-quantity"><small>Quantité</small>{item.quantity}</span>
            <span className="quote-line-price"><small>Prix unitaire</small>{money.format(item.unitPrice)}</span>
            <strong className="quote-line-total"><small>Prix total</small>{money.format(item.quantity * item.unitPrice)}</strong>
          </div>
        ))}
      </section>

      <section className="quote-summary">
        <div className="quote-project-details">
          <div><span>Conditions de paiement</span><strong>{quote.paymentTerms || "À préciser"}</strong></div>
          <div><span>Validité du devis</span><strong>Jusqu’au {formatDate(quote.validUntil)}</strong></div>
          {quote.deposit > 0 && (
            <div className="quote-deposit-row">
              <span>Acompte à la validation</span>
              <strong>{quote.deposit}% · {money.format(totals.depositAmount)}</strong>
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

      {quote.notes && (
        <section className="quote-terms">
          <span>NOTE IMPORTANTE</span>
          <p>{quote.notes}</p>
        </section>
      )}

      <section className="quote-assurance">
        <p>Ce devis a été élaboré avec le souci du détail pour offrir un équilibre juste entre qualité, durabilité et maîtrise des coûts.</p>
        <div><Sparkles size={14} aria-hidden="true" /><strong>Chez Constellation, chaque détail compte.</strong></div>
      </section>

      <footer className="quote-footer">
        <BrandLogo compact />
        <div>
          <strong>{quote.sender.company || "CONSTELLATION"}</strong>
          <span>{quote.sender.name}</span>
          <span>{quote.sender.email}</span>
          <span>{quote.sender.phone}</span>
        </div>
        <div>
          <strong>DEVIS N° {quote.quoteNumber}</strong>
          <span>{quote.sender.address}</span>
          <span>{quote.sender.taxId}</span>
        </div>
      </footer>
    </article>
  );
}
