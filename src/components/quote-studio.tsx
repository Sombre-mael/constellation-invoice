"use client";

import {
  Archive,
  Check,
  ChevronDown,
  CirclePlus,
  Copy,
  FileDown,
  FileText,
  FolderOpen,
  LayoutPanelLeft,
  MoreHorizontal,
  Plus,
  Save,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Currency = "USD" | "CDF" | "EUR";
type QuoteStatus = "Brouillon" | "Prêt à envoyer" | "Envoyé" | "Accepté";
type EditorSection = "client" | "prestations" | "conditions" | "emetteur";

type Party = {
  company: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

type LineItem = {
  id: string;
  description: string;
  details: string;
  quantity: number;
  unitPrice: number;
};

type Quote = {
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

type Notice = { message: string; tone: "success" | "neutral" } | null;

const CURRENT_KEY = "constellation-invoice:current";
const LIBRARY_KEY = "constellation-invoice:library";

const sections: { id: EditorSection; label: string; hint: string }[] = [
  { id: "client", label: "Client & document", hint: "Coordonnées et objet" },
  { id: "prestations", label: "Prestations", hint: "Articles et quantités" },
  { id: "conditions", label: "Conditions", hint: "Taxes, paiement et notes" },
  { id: "emetteur", label: "Constellation", hint: "Vos informations" },
];

function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function makeId(prefix = "quote") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialQuote(today: string, sequence = 1): Quote {
  return {
    id: `draft-${today}`,
    quoteNumber: `DEV-${today.slice(0, 4)}-${String(sequence).padStart(3, "0")}`,
    status: "Brouillon",
    issueDate: today,
    validUntil: addDays(today, 15),
    currency: "USD",
    title: "Identité de marque & présence digitale",
    introduction:
      "Une proposition pensée pour donner à votre marque une identité claire, cohérente et prête à rayonner.",
    client: {
      company: "Client exemple",
      name: "Nom du contact",
      email: "contact@client.com",
      phone: "+243 …",
      address: "Ville, pays",
    },
    sender: {
      company: "CONSTELLATION",
      name: "Votre nom",
      email: "Votre e-mail",
      phone: "Votre téléphone",
      address: "Votre adresse",
      taxId: "Identifiant fiscal (optionnel)",
    },
    items: [
      {
        id: "line-brand",
        description: "Direction artistique & identité visuelle",
        details: "Univers graphique, logo principal et déclinaisons essentielles",
        quantity: 1,
        unitPrice: 850,
      },
      {
        id: "line-web",
        description: "Site vitrine sur mesure",
        details: "Conception responsive, intégration et mise en ligne",
        quantity: 1,
        unitPrice: 1450,
      },
      {
        id: "line-launch",
        description: "Kit de lancement digital",
        details: "Templates sociaux et supports de présentation",
        quantity: 1,
        unitPrice: 420,
      },
    ],
    discount: 0,
    tax: 0,
    deposit: 50,
    paymentTerms: "Acompte à la validation, solde à la livraison.",
    notes:
      "Ce devis comprend deux séries d’ajustements. Toute demande hors périmètre fera l’objet d’une estimation complémentaire.",
    updatedAt: new Date(`${today}T12:00:00`).toISOString(),
  };
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function encodeQuote(quote: Quote) {
  const bytes = new TextEncoder().encode(JSON.stringify(quote));
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeQuote(value: string): Quote | null {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(normalized + padding);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Quote;
    if (!parsed?.quoteNumber || !Array.isArray(parsed.items)) return null;
    return { ...parsed, id: makeId("shared"), status: "Brouillon" };
  } catch {
    return null;
  }
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "field field--wide" : "field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
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

export function QuoteStudio({ today }: { today: string }) {
  const [quote, setQuote] = useState<Quote>(() => createInitialQuote(today));
  const [activeSection, setActiveSection] = useState<EditorSection>("client");
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [ready, setReady] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("Non enregistré");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totals = useMemo(() => {
    const subtotal = quote.items.reduce(
      (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice),
      0,
    );
    const discountAmount = subtotal * (Math.max(0, quote.discount) / 100);
    const taxable = subtotal - discountAmount;
    const taxAmount = taxable * (Math.max(0, quote.tax) / 100);
    const total = taxable + taxAmount;
    const depositAmount = total * (Math.max(0, quote.deposit) / 100);
    return { subtotal, discountAmount, taxAmount, total, depositAmount };
  }, [quote]);

  const money = useMemo(
    () => new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: quote.currency,
      maximumFractionDigits: quote.currency === "CDF" ? 0 : 2,
    }),
    [quote.currency],
  );

  useEffect(() => {
    try {
      const storedLibrary = localStorage.getItem(LIBRARY_KEY);
      if (storedLibrary) setSavedQuotes(JSON.parse(storedLibrary) as Quote[]);

      const sharedValue = window.location.hash.startsWith("#devis=")
        ? window.location.hash.slice(7)
        : null;
      const sharedQuote = sharedValue ? decodeQuote(sharedValue) : null;
      const storedCurrent = localStorage.getItem(CURRENT_KEY);

      if (sharedQuote) {
        setQuote(sharedQuote);
        showNotice("Devis partagé chargé dans un nouveau brouillon", "success");
      } else if (storedCurrent) {
        setQuote(JSON.parse(storedCurrent) as Quote);
      }
    } catch {
      showNotice("Le brouillon local n’a pas pu être restauré", "neutral");
    } finally {
      setReady(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(CURRENT_KEY, JSON.stringify(quote));
      setLastSaved(
        `Enregistré à ${new Intl.DateTimeFormat("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date())}`,
      );
    }, 500);
    return () => window.clearTimeout(timer);
  }, [quote, ready]);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  function showNotice(message: string, tone: NonNullable<Notice>["tone"] = "success") {
    setNotice({ message, tone });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3200);
  }

  function patchQuote<K extends keyof Quote>(field: K, value: Quote[K]) {
    setQuote((current) => ({ ...current, [field]: value, updatedAt: new Date().toISOString() }));
  }

  function patchParty(target: "client" | "sender", field: string, value: string) {
    setQuote((current) => ({
      ...current,
      [target]: { ...current[target], [field]: value },
      updatedAt: new Date().toISOString(),
    }));
  }

  function patchItem(id: string, field: keyof LineItem, value: string | number) {
    setQuote((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, [field]: value } : item),
      updatedAt: new Date().toISOString(),
    }));
  }

  function addItem() {
    setQuote((current) => ({
      ...current,
      items: [...current.items, {
        id: makeId("line"),
        description: "Nouvelle prestation",
        details: "Décrivez ce qui est inclus",
        quantity: 1,
        unitPrice: 0,
      }],
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeItem(id: string) {
    if (quote.items.length === 1) {
      showNotice("Un devis doit conserver au moins une ligne", "neutral");
      return;
    }
    setQuote((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }

  function saveToLibrary() {
    const stamped = { ...quote, updatedAt: new Date().toISOString() };
    const next = [stamped, ...savedQuotes.filter((saved) => saved.id !== quote.id)];
    setQuote(stamped);
    setSavedQuotes(next);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
    localStorage.setItem(CURRENT_KEY, JSON.stringify(stamped));
    showNotice("Devis ajouté à votre bibliothèque");
  }

  function createNewQuote() {
    const next = createInitialQuote(today, savedQuotes.length + 2);
    next.id = makeId();
    next.title = "Nouvelle proposition";
    next.client = { company: "", name: "", email: "", phone: "", address: "" };
    next.items = [{
      id: makeId("line"),
      description: "Votre prestation",
      details: "Détaillez ce qui est inclus",
      quantity: 1,
      unitPrice: 0,
    }];
    setQuote(next);
    setActiveSection("client");
    setMobileView("editor");
    window.history.replaceState(null, "", window.location.pathname);
    showNotice("Nouveau devis prêt à être complété");
  }

  function loadQuote(saved: Quote) {
    setQuote(saved);
    localStorage.setItem(CURRENT_KEY, JSON.stringify(saved));
    setLibraryOpen(false);
    showNotice(`${saved.quoteNumber} chargé`);
  }

  function deleteQuote(id: string) {
    if (!window.confirm("Supprimer définitivement ce devis de cet appareil ?")) return;
    const next = savedQuotes.filter((saved) => saved.id !== id);
    setSavedQuotes(next);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
  }

  async function shareQuote() {
    const url = `${window.location.origin}${window.location.pathname}#devis=${encodeQuote(quote)}`;
    const text = `${quote.quoteNumber} — ${quote.title}\nMontant : ${money.format(totals.total)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Devis ${quote.quoteNumber}`, text, url });
        if (quote.status === "Brouillon") patchQuote("status", "Envoyé");
        showNotice("Options de partage ouvertes");
        return;
      }
      await navigator.clipboard.writeText(url);
      showNotice("Lien du devis copié");
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(url);
          showNotice("Lien du devis copié");
        } catch {
          showNotice("Impossible de copier le lien automatiquement", "neutral");
        }
      }
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Logo />
        <div className="topbar-center">
          <div className="document-identity">
            <FileText size={16} aria-hidden="true" />
            <span>{quote.quoteNumber}</span>
            <span className="status-dot" aria-hidden="true" />
            <span className="save-state">{lastSaved}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="button button--ghost" type="button" onClick={() => setLibraryOpen(true)}>
            <FolderOpen size={17} aria-hidden="true" />
            <span>Mes devis</span>
            {savedQuotes.length > 0 && <span className="count-badge">{savedQuotes.length}</span>}
          </button>
          <button className="button button--ghost new-button" type="button" onClick={createNewQuote}>
            <Plus size={17} aria-hidden="true" /><span>Nouveau</span>
          </button>
          <button className="button button--primary" type="button" onClick={shareQuote}>
            <Send size={16} aria-hidden="true" /> Partager
          </button>
        </div>
      </header>

      <div className="mobile-switch" aria-label="Choisir la vue">
        <button type="button" className={mobileView === "editor" ? "is-active" : ""} onClick={() => setMobileView("editor")}>
          <Settings2 size={16} /> Éditeur
        </button>
        <button type="button" className={mobileView === "preview" ? "is-active" : ""} onClick={() => setMobileView("preview")}>
          <FileText size={16} /> Aperçu
        </button>
      </div>

      <div className="workspace">
        <section className={`editor-pane ${mobileView === "editor" ? "is-mobile-visible" : ""}`}>
          <aside className="section-nav" aria-label="Sections du devis">
            <div className="section-nav-intro">
              <span className="eyebrow">CONTENU</span>
              <span className="progress-value">{sections.findIndex((item) => item.id === activeSection) + 1}/4</span>
            </div>
            {sections.map((section, index) => (
              <button key={section.id} type="button" className={activeSection === section.id ? "section-link is-active" : "section-link"} onClick={() => setActiveSection(section.id)}>
                <span className="section-index">0{index + 1}</span>
                <span><strong>{section.label}</strong><small>{section.hint}</small></span>
              </button>
            ))}
            <div className="nav-tip">
              <Sparkles size={17} aria-hidden="true" />
              <p>Vos modifications apparaissent instantanément dans l’aperçu.</p>
            </div>
          </aside>

          <div className="editor-content">
            {activeSection === "client" && (
              <div className="editor-section">
                <div className="section-heading">
                  <div><span className="eyebrow">ÉTAPE 01</span><h1>Client & document</h1><p>Posez le contexte de la proposition et identifiez son destinataire.</p></div>
                  <span className="section-icon"><LayoutPanelLeft size={20} /></span>
                </div>
                <div className="form-card">
                  <div className="form-card-heading"><h2>Informations du devis</h2><span>Affichées sur le document</span></div>
                  <div className="field-grid">
                    <Field label="Numéro du devis"><input value={quote.quoteNumber} onChange={(event) => patchQuote("quoteNumber", event.target.value)} /></Field>
                    <Field label="Statut">
                      <span className="select-wrap"><select value={quote.status} onChange={(event) => patchQuote("status", event.target.value as QuoteStatus)}><option>Brouillon</option><option>Prêt à envoyer</option><option>Envoyé</option><option>Accepté</option></select><ChevronDown size={15} /></span>
                    </Field>
                    <Field label="Date d’émission"><input type="date" value={quote.issueDate} onChange={(event) => patchQuote("issueDate", event.target.value)} /></Field>
                    <Field label="Valable jusqu’au"><input type="date" value={quote.validUntil} onChange={(event) => patchQuote("validUntil", event.target.value)} /></Field>
                    <Field label="Objet de la proposition" wide><input value={quote.title} onChange={(event) => patchQuote("title", event.target.value)} /></Field>
                    <Field label="Phrase d’introduction" wide><textarea rows={3} value={quote.introduction} onChange={(event) => patchQuote("introduction", event.target.value)} /></Field>
                  </div>
                </div>
                <div className="form-card">
                  <div className="form-card-heading"><h2>Destinataire</h2><span>La personne qui recevra ce devis</span></div>
                  <div className="field-grid">
                    <Field label="Entreprise"><input value={quote.client.company} onChange={(event) => patchParty("client", "company", event.target.value)} /></Field>
                    <Field label="Nom du contact"><input value={quote.client.name} onChange={(event) => patchParty("client", "name", event.target.value)} /></Field>
                    <Field label="E-mail"><input type="email" value={quote.client.email} onChange={(event) => patchParty("client", "email", event.target.value)} /></Field>
                    <Field label="Téléphone"><input value={quote.client.phone} onChange={(event) => patchParty("client", "phone", event.target.value)} /></Field>
                    <Field label="Adresse" wide><input value={quote.client.address} onChange={(event) => patchParty("client", "address", event.target.value)} /></Field>
                  </div>
                </div>
                <button className="button button--next" type="button" onClick={() => setActiveSection("prestations")}>Continuer vers les prestations <span>→</span></button>
              </div>
            )}

            {activeSection === "prestations" && (
              <div className="editor-section">
                <div className="section-heading">
                  <div><span className="eyebrow">ÉTAPE 02</span><h1>Prestations</h1><p>Détaillez le travail proposé. Les montants sont calculés automatiquement.</p></div>
                  <span className="section-icon"><CirclePlus size={20} /></span>
                </div>
                <div className="line-editor-list">
                  {quote.items.map((item, index) => (
                    <article className="line-editor" key={item.id}>
                      <div className="line-editor-top"><span className="line-number">{String(index + 1).padStart(2, "0")}</span><strong>Prestation</strong><button className="icon-button icon-button--danger" type="button" onClick={() => removeItem(item.id)} aria-label="Supprimer cette prestation"><Trash2 size={16} /></button></div>
                      <div className="field-grid line-fields">
                        <Field label="Intitulé" wide><input value={item.description} onChange={(event) => patchItem(item.id, "description", event.target.value)} /></Field>
                        <Field label="Détails" wide><textarea rows={2} value={item.details} onChange={(event) => patchItem(item.id, "details", event.target.value)} /></Field>
                        <Field label="Quantité"><input type="number" min="0" step="1" value={item.quantity} onChange={(event) => patchItem(item.id, "quantity", Number(event.target.value))} /></Field>
                        <Field label={`Prix unitaire (${quote.currency})`}><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => patchItem(item.id, "unitPrice", Number(event.target.value))} /></Field>
                      </div>
                      <div className="line-total"><span>Sous-total</span><strong>{money.format(item.quantity * item.unitPrice)}</strong></div>
                    </article>
                  ))}
                </div>
                <button className="add-line-button" type="button" onClick={addItem}><Plus size={17} /> Ajouter une prestation</button>
                <button className="button button--next" type="button" onClick={() => setActiveSection("conditions")}>Continuer vers les conditions <span>→</span></button>
              </div>
            )}

            {activeSection === "conditions" && (
              <div className="editor-section">
                <div className="section-heading">
                  <div><span className="eyebrow">ÉTAPE 03</span><h1>Conditions</h1><p>Ajustez les montants et clarifiez les modalités de collaboration.</p></div>
                  <span className="section-icon"><Settings2 size={20} /></span>
                </div>
                <div className="form-card">
                  <div className="form-card-heading"><h2>Calculs</h2><span>{money.format(totals.total)} au total</span></div>
                  <div className="field-grid field-grid--three">
                    <Field label="Devise"><span className="select-wrap"><select value={quote.currency} onChange={(event) => patchQuote("currency", event.target.value as Currency)}><option value="USD">USD — Dollar</option><option value="CDF">CDF — Franc congolais</option><option value="EUR">EUR — Euro</option></select><ChevronDown size={15} /></span></Field>
                    <Field label="Remise (%)"><input type="number" min="0" max="100" value={quote.discount} onChange={(event) => patchQuote("discount", Number(event.target.value))} /></Field>
                    <Field label="Taxe / TVA (%)"><input type="number" min="0" value={quote.tax} onChange={(event) => patchQuote("tax", Number(event.target.value))} /></Field>
                    <Field label="Acompte demandé (%)"><input type="number" min="0" max="100" value={quote.deposit} onChange={(event) => patchQuote("deposit", Number(event.target.value))} /></Field>
                  </div>
                  <div className="calculation-strip"><span><small>Sous-total</small><strong>{money.format(totals.subtotal)}</strong></span><span><small>Total</small><strong>{money.format(totals.total)}</strong></span><span><small>Acompte</small><strong>{money.format(totals.depositAmount)}</strong></span></div>
                </div>
                <div className="form-card">
                  <div className="form-card-heading"><h2>Modalités</h2><span>Pour éviter les zones grises</span></div>
                  <div className="field-grid">
                    <Field label="Conditions de paiement" wide><textarea rows={3} value={quote.paymentTerms} onChange={(event) => patchQuote("paymentTerms", event.target.value)} /></Field>
                    <Field label="Notes et périmètre" wide><textarea rows={5} value={quote.notes} onChange={(event) => patchQuote("notes", event.target.value)} /></Field>
                  </div>
                </div>
                <button className="button button--next" type="button" onClick={() => setActiveSection("emetteur")}>Finaliser les informations <span>→</span></button>
              </div>
            )}

            {activeSection === "emetteur" && (
              <div className="editor-section">
                <div className="section-heading">
                  <div><span className="eyebrow">ÉTAPE 04</span><h1>Informations Constellation</h1><p>Complétez une fois les coordonnées qui signeront vos devis.</p></div>
                  <span className="section-icon"><Sparkles size={20} /></span>
                </div>
                <div className="form-card">
                  <div className="form-card-heading"><h2>Émetteur</h2><span>Visible en pied de page</span></div>
                  <div className="field-grid">
                    <Field label="Nom de l’entreprise"><input value={quote.sender.company} onChange={(event) => patchParty("sender", "company", event.target.value)} /></Field>
                    <Field label="Personne de contact"><input value={quote.sender.name} onChange={(event) => patchParty("sender", "name", event.target.value)} /></Field>
                    <Field label="E-mail"><input value={quote.sender.email} onChange={(event) => patchParty("sender", "email", event.target.value)} /></Field>
                    <Field label="Téléphone"><input value={quote.sender.phone} onChange={(event) => patchParty("sender", "phone", event.target.value)} /></Field>
                    <Field label="Adresse" wide><input value={quote.sender.address} onChange={(event) => patchParty("sender", "address", event.target.value)} /></Field>
                    <Field label="Identifiant fiscal" wide><input value={quote.sender.taxId} onChange={(event) => patchParty("sender", "taxId", event.target.value)} /></Field>
                  </div>
                </div>
                <div className="finish-card">
                  <span className="finish-icon"><Check size={20} /></span>
                  <div><strong>Votre devis est prêt.</strong><p>Enregistrez-le dans votre bibliothèque, exportez-le en PDF ou partagez un lien.</p></div>
                  <button className="button button--primary" type="button" onClick={saveToLibrary}><Save size={16} /> Enregistrer</button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={`preview-pane ${mobileView === "preview" ? "is-mobile-visible" : ""}`}>
          <div className="preview-toolbar">
            <div><span className="preview-live"><span /> APERÇU EN DIRECT</span><small>Format A4 · {quote.currency}</small></div>
            <div className="preview-actions">
              <button className="icon-button" type="button" onClick={saveToLibrary} aria-label="Enregistrer le devis"><Save size={16} /></button>
              <button className="button button--light" type="button" onClick={() => window.print()}><FileDown size={16} /> PDF</button>
              <button className="icon-button" type="button" onClick={shareQuote} aria-label="Partager le devis"><MoreHorizontal size={18} /></button>
            </div>
          </div>
          <div className="paper-wrap">
            <article className="quote-page">
              <div className="quote-accent" />
              <header className="quote-header">
                <Logo compact />
                <div className="quote-meta"><span className="quote-status">{quote.status}</span><strong>{quote.quoteNumber}</strong><small>Émis le {formatDate(quote.issueDate)}</small></div>
              </header>
              <section className="quote-hero"><span className="quote-kicker">PROPOSITION COMMERCIALE</span><h2>{quote.title || "Votre proposition"}</h2><p>{quote.introduction}</p></section>
              <section className="quote-parties">
                <div><span>PRÉPARÉ POUR</span><strong>{quote.client.company || "Nom du client"}</strong><p>{quote.client.name}</p><p>{quote.client.email}</p><p>{quote.client.phone}</p><p>{quote.client.address}</p></div>
                <div><span>VALABLE JUSQU’AU</span><strong>{formatDate(quote.validUntil)}</strong><p>Une fenêtre claire pour décider sereinement.</p></div>
              </section>
              <section className="quote-lines">
                <div className="quote-table-head"><span>DESCRIPTION</span><span>QTÉ</span><span>PRIX</span><span>TOTAL</span></div>
                {quote.items.map((item) => (
                  <div className="quote-line" key={item.id}>
                    <div><strong>{item.description || "Prestation"}</strong><p>{item.details}</p></div>
                    <span>{item.quantity}</span><span>{money.format(item.unitPrice)}</span><strong>{money.format(item.quantity * item.unitPrice)}</strong>
                  </div>
                ))}
              </section>
              <section className="quote-summary">
                <div className="quote-note"><span>CONDITIONS</span><p>{quote.paymentTerms}</p>{quote.deposit > 0 && <div className="deposit-note"><Sparkles size={15} /><span>Acompte à la validation : <strong>{money.format(totals.depositAmount)}</strong></span></div>}</div>
                <div className="totals-table">
                  <p><span>Sous-total</span><strong>{money.format(totals.subtotal)}</strong></p>
                  {quote.discount > 0 && <p><span>Remise ({quote.discount}%)</span><strong>− {money.format(totals.discountAmount)}</strong></p>}
                  {quote.tax > 0 && <p><span>Taxe / TVA ({quote.tax}%)</span><strong>{money.format(totals.taxAmount)}</strong></p>}
                  <div><span>TOTAL</span><strong>{money.format(totals.total)}</strong></div>
                </div>
              </section>
              <section className="quote-terms"><span>NOTES</span><p>{quote.notes}</p></section>
              <footer className="quote-footer">
                <Logo compact />
                <div><strong>{quote.sender.name}</strong><span>{quote.sender.email}</span><span>{quote.sender.phone}</span></div>
                <div><strong>{quote.sender.address}</strong><span>{quote.sender.taxId}</span></div>
              </footer>
            </article>
          </div>
        </section>
      </div>

      {libraryOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setLibraryOpen(false)}>
          <section className="library-modal" role="dialog" aria-modal="true" aria-labelledby="library-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span className="eyebrow">BIBLIOTHÈQUE LOCALE</span><h2 id="library-title">Mes devis</h2><p>Enregistrés uniquement sur cet appareil.</p></div><button className="icon-button" type="button" onClick={() => setLibraryOpen(false)} aria-label="Fermer"><X size={18} /></button></header>
            {savedQuotes.length === 0 ? (
              <div className="empty-library"><span><Archive size={24} /></span><h3>Aucun devis enregistré</h3><p>Le bouton « Enregistrer » ajoutera votre devis ici.</p><button className="button button--primary" type="button" onClick={() => { saveToLibrary(); setLibraryOpen(false); }}><Save size={16} /> Enregistrer le devis actuel</button></div>
            ) : (
              <div className="quote-library-list">
                {savedQuotes.map((saved) => (
                  <article key={saved.id}>
                    <button className="quote-library-main" type="button" onClick={() => loadQuote(saved)}><span className="library-file"><FileText size={18} /></span><span><strong>{saved.quoteNumber}</strong><small>{saved.client.company || "Sans client"} · {saved.title}</small></span><span className="library-total">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: saved.currency }).format(saved.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}</span></button>
                    <button className="icon-button icon-button--danger" type="button" onClick={() => deleteQuote(saved.id)} aria-label={`Supprimer ${saved.quoteNumber}`}><Trash2 size={16} /></button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {notice && <div className={`toast toast--${notice.tone}`} role="status">{notice.tone === "success" ? <Check size={17} /> : <Copy size={17} />}{notice.message}</div>}
    </main>
  );
}
