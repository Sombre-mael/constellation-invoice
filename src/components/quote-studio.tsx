"use client";

import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CirclePlus,
  Copy,
  Eye,
  FileDown,
  FileText,
  FolderOpen,
  LayoutPanelLeft,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, domAnimation, LazyMotion, m, MotionConfig } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BrandLogo, QuoteDocument } from "@/components/quote-document";
import { PwaControl } from "@/components/pwa-manager";
import type {
  Currency,
  EditorSection,
  LineItem,
  MobilePreviewMode,
  Quote,
  QuoteStatus,
  QuoteTotals,
  StepDirection,
} from "@/lib/quote-types";

type Notice = { message: string; tone: "success" | "neutral" } | null;

const CURRENT_KEY = "constellation-invoice:v1:current";
const LIBRARY_KEY = "constellation-invoice:v1:library";
const A4_PREVIEW_WIDTH = 720;

const sections: { id: EditorSection; label: string; shortLabel: string; hint: string }[] = [
  { id: "client", label: "Client & document", shortLabel: "Client", hint: "Coordonnées et objet" },
  { id: "prestations", label: "Prestations", shortLabel: "Services", hint: "Articles et quantités" },
  { id: "conditions", label: "Conditions", shortLabel: "Conditions", hint: "Taxes, paiement et notes" },
  { id: "emetteur", label: "Constellation", shortLabel: "Émetteur", hint: "Vos informations" },
];

const stepVariants = {
  enter: (direction: StepDirection) => ({ opacity: 0, x: direction * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: StepDirection) => ({ opacity: 0, x: direction * -20 }),
};

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
    introduction: "Une proposition pensée pour donner à votre marque une identité claire, cohérente et prête à rayonner.",
    client: { company: "Client exemple", name: "Nom du contact", email: "contact@client.com", phone: "+243 …", address: "Ville, pays" },
    sender: { company: "CONSTELLATION", name: "Votre nom", email: "Votre e-mail", phone: "Votre téléphone", address: "Votre adresse", taxId: "Identifiant fiscal (optionnel)" },
    items: [
      { id: "line-brand", description: "Direction artistique & identité visuelle", details: "Univers graphique, logo principal et déclinaisons essentielles", quantity: 1, unitPrice: 850 },
      { id: "line-web", description: "Site vitrine sur mesure", details: "Conception responsive, intégration et mise en ligne", quantity: 1, unitPrice: 1450 },
      { id: "line-launch", description: "Kit de lancement digital", details: "Templates sociaux et supports de présentation", quantity: 1, unitPrice: 420 },
    ],
    discount: 0,
    tax: 0,
    deposit: 50,
    paymentTerms: "Acompte à la validation, solde à la livraison.",
    notes: "Ce devis comprend deux séries d’ajustements. Toute demande hors périmètre fera l’objet d’une estimation complémentaire.",
    updatedAt: new Date(`${today}T12:00:00`).toISOString(),
  };
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

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={wide ? "field field--wide" : "field"}><span>{label}</span>{children}</label>;
}

function A4Preview({ quote, totals, money }: { quote: Quote; totals: QuoteTotals; money: Intl.NumberFormat }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ scale: 1, height: 940 });

  useEffect(() => {
    const frame = frameRef.current;
    const page = pageRef.current;
    if (!frame || !page) return;
    const update = () => {
      const scale = Math.min(1, frame.clientWidth / A4_PREVIEW_WIDTH);
      setDimensions({ scale, height: Math.max(940, page.scrollHeight) * scale });
    };
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(page);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <div className="a4-preview-frame" ref={frameRef}>
      <div className="a4-preview-spacer" style={{ height: dimensions.height, width: A4_PREVIEW_WIDTH * dimensions.scale }}>
        <div className="a4-preview-canvas" ref={pageRef} style={{ "--a4-scale": dimensions.scale } as CSSProperties}>
          <QuoteDocument quote={quote} totals={totals} money={money} variant="a4" />
        </div>
      </div>
    </div>
  );
}

export function QuoteStudio({ today }: { today: string }) {
  const [quote, setQuote] = useState<Quote>(() => createInitialQuote(today));
  const [activeSection, setActiveSection] = useState<EditorSection>("client");
  const [stepDirection, setStepDirection] = useState<StepDirection>(1);
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const [mobilePreviewMode, setMobilePreviewMode] = useState<MobilePreviewMode>("readable");
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [ready, setReady] = useState(false);
  const [lastSaved, setLastSaved] = useState("Non enregistré");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocusStep = useRef(false);
  const mobileLibraryButtonRef = useRef<HTMLButtonElement>(null);
  const libraryCloseButtonRef = useRef<HTMLButtonElement>(null);
  const activeIndex = sections.findIndex((section) => section.id === activeSection);

  const totals = useMemo<QuoteTotals>(() => {
    const subtotal = quote.items.reduce((sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice), 0);
    const discountAmount = subtotal * (Math.max(0, quote.discount) / 100);
    const taxable = subtotal - discountAmount;
    const taxAmount = taxable * (Math.max(0, quote.tax) / 100);
    const total = taxable + taxAmount;
    const depositAmount = total * (Math.max(0, quote.deposit) / 100);
    return { subtotal, discountAmount, taxAmount, total, depositAmount };
  }, [quote]);

  const money = useMemo(() => new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: quote.currency, maximumFractionDigits: quote.currency === "CDF" ? 0 : 2,
  }), [quote.currency]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const storedLibrary = localStorage.getItem(LIBRARY_KEY);
        if (storedLibrary) setSavedQuotes(JSON.parse(storedLibrary) as Quote[]);
        const sharedValue = window.location.hash.startsWith("#devis=") ? window.location.hash.slice(7) : null;
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
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(CURRENT_KEY, JSON.stringify(quote));
      setLastSaved(`Enregistré à ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [quote, ready]);

  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  useEffect(() => {
    if (!libraryOpen) return;
    const previousOverflow = document.body.style.overflow;
    const libraryTrigger = mobileLibraryButtonRef.current;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setLibraryOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => libraryCloseButtonRef.current?.focus(), 180);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
      libraryTrigger?.focus({ preventScroll: true });
    };
  }, [libraryOpen]);

  function showNotice(message: string, tone: NonNullable<Notice>["tone"] = "success") {
    setNotice({ message, tone });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3200);
  }

  function patchQuote<K extends keyof Quote>(field: K, value: Quote[K]) {
    setQuote((current) => ({ ...current, [field]: value, updatedAt: new Date().toISOString() }));
  }

  function patchParty(target: "client" | "sender", field: string, value: string) {
    setQuote((current) => ({ ...current, [target]: { ...current[target], [field]: value }, updatedAt: new Date().toISOString() }));
  }

  function patchItem(id: string, field: keyof LineItem, value: string | number) {
    setQuote((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [field]: value } : item), updatedAt: new Date().toISOString() }));
  }

  function addItem() {
    setQuote((current) => ({ ...current, items: [...current.items, { id: makeId("line"), description: "Nouvelle prestation", details: "Décrivez ce qui est inclus", quantity: 1, unitPrice: 0 }], updatedAt: new Date().toISOString() }));
  }

  function removeItem(id: string) {
    if (quote.items.length === 1) {
      showNotice("Un devis doit conserver au moins une ligne", "neutral");
      return;
    }
    setQuote((current) => ({ ...current, items: current.items.filter((item) => item.id !== id), updatedAt: new Date().toISOString() }));
  }

  function goToSection(section: EditorSection) {
    const nextIndex = sections.findIndex((item) => item.id === section);
    setStepDirection(nextIndex >= activeIndex ? 1 : -1);
    shouldFocusStep.current = nextIndex !== activeIndex;
    setActiveSection(section);
    setMobileView("editor");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function moveStep(direction: StepDirection) {
    const nextIndex = Math.max(0, Math.min(sections.length - 1, activeIndex + direction));
    if (nextIndex === activeIndex && direction === 1) {
      setMobileView("preview");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    goToSection(sections[nextIndex].id);
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
    next.items = [{ id: makeId("line"), description: "Votre prestation", details: "Détaillez ce qui est inclus", quantity: 1, unitPrice: 0 }];
    setQuote(next);
    setActiveSection("client");
    setMobileView("editor");
    setStepDirection(-1);
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
        try { await navigator.clipboard.writeText(url); showNotice("Lien du devis copié"); }
        catch { showNotice("Impossible de copier le lien automatiquement", "neutral"); }
      }
    }
  }

  function renderEditorSection() {
    if (activeSection === "client") return (
      <div className="editor-section">
        <div className="section-heading"><div><span className="eyebrow">ÉTAPE 01</span><h1 ref={sectionHeadingRef} tabIndex={-1}>Client & document</h1><p>Posez le contexte de la proposition et identifiez son destinataire.</p></div><span className="section-icon"><LayoutPanelLeft size={20} aria-hidden="true" /></span></div>
        <div className="form-card">
          <div className="form-card-heading"><h2>Informations du devis</h2><span>Affichées sur le document</span></div>
          <div className="field-grid">
            <Field label="Numéro du devis"><input value={quote.quoteNumber} onChange={(event) => patchQuote("quoteNumber", event.target.value)} /></Field>
            <Field label="Statut"><span className="select-wrap"><select value={quote.status} onChange={(event) => patchQuote("status", event.target.value as QuoteStatus)}><option>Brouillon</option><option>Prêt à envoyer</option><option>Envoyé</option><option>Accepté</option></select><ChevronDown size={15} aria-hidden="true" /></span></Field>
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
            <Field label="Téléphone"><input inputMode="tel" value={quote.client.phone} onChange={(event) => patchParty("client", "phone", event.target.value)} /></Field>
            <Field label="Adresse" wide><input value={quote.client.address} onChange={(event) => patchParty("client", "address", event.target.value)} /></Field>
          </div>
        </div>
        <button className="button button--next" type="button" onClick={() => goToSection("prestations")}>Continuer vers les prestations <span>→</span></button>
      </div>
    );

    if (activeSection === "prestations") return (
      <div className="editor-section">
        <div className="section-heading"><div><span className="eyebrow">ÉTAPE 02</span><h1 ref={sectionHeadingRef} tabIndex={-1}>Prestations</h1><p>Détaillez le travail proposé. Les montants sont calculés automatiquement.</p></div><span className="section-icon"><CirclePlus size={20} aria-hidden="true" /></span></div>
        <div className="line-editor-list">
          <AnimatePresence initial={false}>
            {quote.items.map((item, index) => (
              <m.article className="line-editor" key={item.id} layout initial={{ opacity: 0, height: 0, y: 12 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -8 }} transition={{ duration: 0.24 }}>
                <div className="line-editor-top"><span className="line-number">{String(index + 1).padStart(2, "0")}</span><strong>Prestation</strong><button className="icon-button icon-button--danger" type="button" onClick={() => removeItem(item.id)} aria-label="Supprimer cette prestation"><Trash2 size={16} aria-hidden="true" /></button></div>
                <div className="field-grid line-fields">
                  <Field label="Intitulé" wide><input value={item.description} onChange={(event) => patchItem(item.id, "description", event.target.value)} /></Field>
                  <Field label="Détails" wide><textarea rows={2} value={item.details} onChange={(event) => patchItem(item.id, "details", event.target.value)} /></Field>
                  <Field label="Quantité"><input type="number" inputMode="decimal" min="0" step="1" value={item.quantity} onChange={(event) => patchItem(item.id, "quantity", Number(event.target.value))} /></Field>
                  <Field label={`Prix unitaire (${quote.currency})`}><input type="number" inputMode="decimal" min="0" step="0.01" value={item.unitPrice} onChange={(event) => patchItem(item.id, "unitPrice", Number(event.target.value))} /></Field>
                </div>
                <div className="line-total"><span>Sous-total</span><strong>{money.format(item.quantity * item.unitPrice)}</strong></div>
              </m.article>
            ))}
          </AnimatePresence>
        </div>
        <button className="add-line-button" type="button" onClick={addItem}><Plus size={17} aria-hidden="true" /> Ajouter une prestation</button>
        <button className="button button--next" type="button" onClick={() => goToSection("conditions")}>Continuer vers les conditions <span>→</span></button>
      </div>
    );

    if (activeSection === "conditions") return (
      <div className="editor-section">
        <div className="section-heading"><div><span className="eyebrow">ÉTAPE 03</span><h1 ref={sectionHeadingRef} tabIndex={-1}>Conditions</h1><p>Ajustez les montants et clarifiez les modalités de collaboration.</p></div><span className="section-icon"><Settings2 size={20} aria-hidden="true" /></span></div>
        <div className="form-card">
          <div className="form-card-heading"><h2>Calculs</h2><span>{money.format(totals.total)} au total</span></div>
          <div className="field-grid field-grid--three">
            <Field label="Devise"><span className="select-wrap"><select value={quote.currency} onChange={(event) => patchQuote("currency", event.target.value as Currency)}><option value="USD">USD — Dollar</option><option value="CDF">CDF — Franc congolais</option><option value="EUR">EUR — Euro</option></select><ChevronDown size={15} aria-hidden="true" /></span></Field>
            <Field label="Remise (%)"><input type="number" inputMode="decimal" min="0" max="100" value={quote.discount} onChange={(event) => patchQuote("discount", Number(event.target.value))} /></Field>
            <Field label="Taxe / TVA (%)"><input type="number" inputMode="decimal" min="0" value={quote.tax} onChange={(event) => patchQuote("tax", Number(event.target.value))} /></Field>
            <Field label="Acompte demandé (%)"><input type="number" inputMode="decimal" min="0" max="100" value={quote.deposit} onChange={(event) => patchQuote("deposit", Number(event.target.value))} /></Field>
          </div>
          <div className="calculation-strip"><span><small>Sous-total</small><strong>{money.format(totals.subtotal)}</strong></span><span><small>Total</small><strong>{money.format(totals.total)}</strong></span><span><small>Acompte</small><strong>{money.format(totals.depositAmount)}</strong></span></div>
        </div>
        <div className="form-card">
          <div className="form-card-heading"><h2>Modalités</h2><span>Pour éviter les zones grises</span></div>
          <div className="field-grid"><Field label="Conditions de paiement" wide><textarea rows={3} value={quote.paymentTerms} onChange={(event) => patchQuote("paymentTerms", event.target.value)} /></Field><Field label="Notes et périmètre" wide><textarea rows={5} value={quote.notes} onChange={(event) => patchQuote("notes", event.target.value)} /></Field></div>
        </div>
        <button className="button button--next" type="button" onClick={() => goToSection("emetteur")}>Finaliser les informations <span>→</span></button>
      </div>
    );

    return (
      <div className="editor-section">
        <div className="section-heading"><div><span className="eyebrow">ÉTAPE 04</span><h1 ref={sectionHeadingRef} tabIndex={-1}>Informations Constellation</h1><p>Complétez une fois les coordonnées qui signeront vos devis.</p></div><span className="section-icon"><Sparkles size={20} aria-hidden="true" /></span></div>
        <div className="form-card">
          <div className="form-card-heading"><h2>Émetteur</h2><span>Visible en pied de page</span></div>
          <div className="field-grid">
            <Field label="Nom de l’entreprise"><input value={quote.sender.company} onChange={(event) => patchParty("sender", "company", event.target.value)} /></Field>
            <Field label="Personne de contact"><input value={quote.sender.name} onChange={(event) => patchParty("sender", "name", event.target.value)} /></Field>
            <Field label="E-mail"><input type="email" value={quote.sender.email} onChange={(event) => patchParty("sender", "email", event.target.value)} /></Field>
            <Field label="Téléphone"><input inputMode="tel" value={quote.sender.phone} onChange={(event) => patchParty("sender", "phone", event.target.value)} /></Field>
            <Field label="Adresse" wide><input value={quote.sender.address} onChange={(event) => patchParty("sender", "address", event.target.value)} /></Field>
            <Field label="Identifiant fiscal" wide><input value={quote.sender.taxId} onChange={(event) => patchParty("sender", "taxId", event.target.value)} /></Field>
          </div>
        </div>
        <div className="finish-card"><span className="finish-icon"><Check size={20} aria-hidden="true" /></span><div><strong>Votre devis est prêt.</strong><p>Enregistrez-le, exportez-le en PDF ou partagez un lien.</p></div><button className="button button--primary" type="button" onClick={saveToLibrary}><Save size={16} aria-hidden="true" /> Enregistrer</button></div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
      <LazyMotion features={domAnimation} strict>
        <main className="app-shell">
          <header className="topbar">
            <BrandLogo />
            <div className="topbar-center"><div className="document-identity"><FileText size={16} aria-hidden="true" /><span>{quote.quoteNumber}</span><span className="status-dot" aria-hidden="true" /><span className="save-state">{lastSaved}</span></div></div>
            <div className="topbar-actions">
              <PwaControl />
              <button className="button button--ghost" type="button" onClick={() => setLibraryOpen(true)}><FolderOpen size={17} aria-hidden="true" /><span>Mes devis</span>{savedQuotes.length > 0 && <span className="count-badge">{savedQuotes.length}</span>}</button>
              <button className="button button--ghost new-button" type="button" onClick={createNewQuote}><Plus size={17} aria-hidden="true" /><span>Nouveau</span></button>
              <button className="button button--primary" type="button" onClick={shareQuote}><Send size={16} aria-hidden="true" /> Partager</button>
            </div>
          </header>

          <header className="mobile-header">
            <div className="mobile-header-main">
              <BrandLogo compact />
              <div className="mobile-document-state"><strong>{quote.quoteNumber}</strong><span><i />{lastSaved}</span></div>
              <button ref={mobileLibraryButtonRef} className="mobile-header-library" type="button" onClick={() => setLibraryOpen(true)} aria-label="Ouvrir mes devis"><FolderOpen size={19} aria-hidden="true" />{savedQuotes.length > 0 && <span>{savedQuotes.length}</span>}</button>
            </div>
            <nav className="mobile-progress" aria-label="Progression du devis">
              {sections.map((section, index) => (
                <button key={section.id} type="button" className={activeSection === section.id ? "is-active" : ""} aria-current={activeSection === section.id ? "step" : undefined} onClick={() => goToSection(section.id)}>
                  <span className="mobile-progress-dot">{activeSection === section.id && <m.span layoutId="active-mobile-step" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}{index + 1}</span>
                  <small>{section.shortLabel}</small>
                </button>
              ))}
            </nav>
          </header>

          <div className="mobile-switch" aria-label="Choisir la vue">
            <button type="button" className={mobileView === "editor" ? "is-active" : ""} onClick={() => setMobileView("editor")}><Settings2 size={16} aria-hidden="true" /> Éditeur</button>
            <button type="button" className={mobileView === "preview" ? "is-active" : ""} onClick={() => setMobileView("preview")}><FileText size={16} aria-hidden="true" /> Aperçu</button>
          </div>

          <div className="workspace">
            <section className={`editor-pane ${mobileView === "editor" ? "is-mobile-visible" : ""}`}>
              <aside className="section-nav" aria-label="Sections du devis">
                <div className="section-nav-intro"><span className="eyebrow">CONTENU</span><span className="progress-value">{activeIndex + 1}/4</span></div>
                {sections.map((section, index) => <button key={section.id} type="button" className={activeSection === section.id ? "section-link is-active" : "section-link"} onClick={() => goToSection(section.id)}><span className="section-index">0{index + 1}</span><span><strong>{section.label}</strong><small>{section.hint}</small></span></button>)}
                <div className="nav-tip"><Sparkles size={17} aria-hidden="true" /><p>Vos modifications apparaissent instantanément dans l’aperçu.</p></div>
              </aside>
              <div className="editor-content"><AnimatePresence mode="wait" initial={false} custom={stepDirection}><m.div key={activeSection} custom={stepDirection} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.24 }} onAnimationComplete={(definition) => { if (definition === "center" && shouldFocusStep.current) { shouldFocusStep.current = false; sectionHeadingRef.current?.focus({ preventScroll: true }); } }}>{renderEditorSection()}</m.div></AnimatePresence></div>
            </section>

            <section className={`preview-pane ${mobileView === "preview" ? "is-mobile-visible" : ""}`}>
              <div className="preview-toolbar">
                <div><span className="preview-live"><span /> APERÇU EN DIRECT</span><small>Format A4 · {quote.currency}</small></div>
                <div className="preview-mode-switch" aria-label="Mode d’aperçu mobile">
                  {(["readable", "a4"] as MobilePreviewMode[]).map((mode) => <button key={mode} type="button" className={mobilePreviewMode === mode ? "is-active" : ""} onClick={() => setMobilePreviewMode(mode)}>{mobilePreviewMode === mode && <m.span layoutId="active-preview-mode" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}<strong>{mode === "readable" ? "Lecture" : "A4"}</strong></button>)}
                </div>
                <div className="preview-actions"><button className="icon-button" type="button" onClick={saveToLibrary} aria-label="Enregistrer le devis"><Save size={16} aria-hidden="true" /></button><button className="button button--light" type="button" onClick={() => window.print()}><FileDown size={16} aria-hidden="true" /> PDF</button><button className="icon-button" type="button" onClick={shareQuote} aria-label="Partager le devis"><MoreHorizontal size={18} aria-hidden="true" /></button></div>
              </div>
              <div className="paper-wrap preview-desktop-document"><QuoteDocument quote={quote} totals={totals} money={money} /></div>
              <div className="preview-mobile-document"><AnimatePresence mode="wait" initial={false}><m.div key={mobilePreviewMode} className="mobile-document-motion" initial={{ opacity: 0, scale: 0.985, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.99, y: -5 }}>{mobilePreviewMode === "readable" ? <QuoteDocument quote={quote} totals={totals} money={money} variant="readable" /> : <A4Preview quote={quote} totals={totals} money={money} />}</m.div></AnimatePresence></div>
            </section>
          </div>

          <nav className="mobile-action-bar" aria-label="Actions du devis">
            {mobileView === "editor" ? <><button className="mobile-action-secondary" type="button" disabled={activeIndex === 0} onClick={() => moveStep(-1)}><ArrowLeft size={19} aria-hidden="true" /><span>Précédent</span></button><button className="mobile-action-preview" type="button" onClick={() => { setMobileView("preview"); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Eye size={18} aria-hidden="true" /><span><small>Aperçu</small><strong>{money.format(totals.total)}</strong></span></button><button className="mobile-action-primary" type="button" onClick={() => moveStep(1)}><span>{activeIndex === sections.length - 1 ? "Finaliser" : "Continuer"}</span><ArrowRight size={19} aria-hidden="true" /></button></> : <><button className="mobile-action-secondary" type="button" onClick={() => setMobileView("editor")}><Pencil size={18} aria-hidden="true" /><span>Modifier</span></button><button className="mobile-action-preview" type="button" onClick={() => window.print()}><FileDown size={18} aria-hidden="true" /><span><small>Exporter</small><strong>PDF A4</strong></span></button><button className="mobile-action-primary" type="button" onClick={shareQuote}><span>Partager</span><Send size={18} aria-hidden="true" /></button></>}
          </nav>

          <AnimatePresence>
            {libraryOpen && <m.div className="modal-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(event) => { if (event.target === event.currentTarget) setLibraryOpen(false); }}><m.section className="library-modal" role="dialog" aria-modal="true" aria-labelledby="library-title" initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 28, scale: 0.99 }} transition={{ type: "spring", stiffness: 360, damping: 34 }}><span className="sheet-handle" aria-hidden="true" /><header><div><span className="eyebrow">BIBLIOTHÈQUE LOCALE</span><h2 id="library-title">Mes devis</h2><p>Enregistrés uniquement sur cet appareil.</p></div><button ref={libraryCloseButtonRef} className="icon-button" type="button" onClick={() => setLibraryOpen(false)} aria-label="Fermer"><X size={18} aria-hidden="true" /></button></header>{savedQuotes.length === 0 ? <div className="empty-library"><span><Archive size={24} aria-hidden="true" /></span><h3>Aucun devis enregistré</h3><p>Le bouton « Enregistrer » ajoutera votre devis ici.</p><button className="button button--primary" type="button" onClick={() => { saveToLibrary(); setLibraryOpen(false); }}><Save size={16} aria-hidden="true" /> Enregistrer le devis actuel</button></div> : <div className="quote-library-list">{savedQuotes.map((saved) => <article key={saved.id}><button className="quote-library-main" type="button" onClick={() => loadQuote(saved)}><span className="library-file"><FileText size={18} aria-hidden="true" /></span><span><strong>{saved.quoteNumber}</strong><small>{saved.client.company || "Sans client"} · {saved.title}</small></span><span className="library-total">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: saved.currency }).format(saved.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}</span></button><button className="icon-button icon-button--danger" type="button" onClick={() => deleteQuote(saved.id)} aria-label={`Supprimer ${saved.quoteNumber}`}><Trash2 size={16} aria-hidden="true" /></button></article>)}</div>}<PwaControl variant="panel" /></m.section></m.div>}
          </AnimatePresence>

          <AnimatePresence>{notice && <m.div className={`toast toast--${notice.tone}`} role="status" initial={{ opacity: 0, y: 16, x: "-50%", scale: 0.96 }} animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }} exit={{ opacity: 0, y: 10, x: "-50%", scale: 0.97 }} transition={{ type: "spring", stiffness: 420, damping: 32 }}>{notice.tone === "success" ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}{notice.message}</m.div>}</AnimatePresence>
        </main>
      </LazyMotion>
    </MotionConfig>
  );
}
