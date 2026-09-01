"use client";

import {
  CheckCircle2,
  CloudOff,
  Download,
  RefreshCw,
  Share2,
  Smartphone,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaPhase =
  | "checking"
  | "current"
  | "update-available"
  | "updating"
  | "offline"
  | "error"
  | "unsupported";

type PwaContextValue = {
  availableVersion: string | null;
  clientVersion: string;
  dismissInstall: () => void;
  installApp: () => Promise<void>;
  installAvailable: boolean;
  installDismissed: boolean;
  installed: boolean;
  isIos: boolean;
  phase: PwaPhase;
  updateApp: () => Promise<void>;
};

const INSTALL_DISMISSED_KEY = "constellation-invoice:pwa:install-dismissed";
const UPDATE_INTERVAL = 15 * 60 * 1000;
const PwaContext = createContext<PwaContextValue | null>(null);

function shortVersion(version: string | null) {
  if (!version) return "Nouvelle version";
  const [release, deployment] = version.split("+");
  return deployment ? `v${release} · ${deployment.slice(0, 8)}` : `v${release}`;
}

async function waitForWaitingWorker(registration: ServiceWorkerRegistration) {
  if (registration.waiting) return registration.waiting;
  const worker = registration.installing;
  if (!worker) return null;

  await Promise.race([
    new Promise<void>((resolve) => {
      const onStateChange = () => {
        if (worker.state === "installed" || worker.state === "redundant") {
          worker.removeEventListener("statechange", onStateChange);
          resolve();
        }
      };
      worker.addEventListener("statechange", onStateChange);
    }),
    new Promise<void>((resolve) => window.setTimeout(resolve, 4000)),
  ]);

  return registration.waiting;
}

export function PwaProvider({
  children,
  clientVersion,
}: {
  children: ReactNode;
  clientVersion: string;
}) {
  const [phase, setPhase] = useState<PwaPhase>("checking");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadRequested = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (!navigator.onLine) {
      setPhase("offline");
      return;
    }

    try {
      const response = await fetch("/api/version", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!response.ok) throw new Error("Version indisponible");
      const payload = await response.json() as { version?: string };
      const deployedVersion = payload.version;

      if (deployedVersion && deployedVersion !== clientVersion) {
        setAvailableVersion(deployedVersion);
        setPhase("update-available");
        await registrationRef.current?.update();
        return;
      }

      if (registrationRef.current?.waiting) {
        setAvailableVersion(deployedVersion ?? null);
        setPhase("update-available");
        return;
      }

      setAvailableVersion(null);
      setPhase("current");
    } catch {
      setPhase(navigator.onLine ? "error" : "offline");
    }
  }, [clientVersion]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const standalone = window.matchMedia("(display-mode: standalone)").matches
        || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      setInstalled(standalone);
      setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
      setInstallDismissed(localStorage.getItem(INSTALL_DISMISSED_KEY) === "1");
    });

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setInstallPrompt(promptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      localStorage.removeItem(INSTALL_DISMISSED_KEY);
      setInstallDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      const unsupportedTimer = window.setTimeout(() => setPhase("unsupported"), 0);
      return () => window.clearTimeout(unsupportedTimer);
    }

    let disposed = false;
    let updateTimer: number | undefined;

    const onControllerChange = () => {
      if (reloadRequested.current) window.location.reload();
    };
    const onMessage = (event: MessageEvent<{ type?: string; version?: string }>) => {
      if (event.data?.type === "PWA_ACTIVATED" && reloadRequested.current) {
        window.location.reload();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    const onOnline = () => void checkForUpdate();
    const onOffline = () => setPhase("offline");

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.addEventListener("message", onMessage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    void navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    }).then((registration) => {
      if (disposed) return;
      registrationRef.current = registration;

      if (registration.waiting) setPhase("update-available");
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setPhase("update-available");
          }
        });
      });

      void checkForUpdate();
      updateTimer = window.setInterval(() => void checkForUpdate(), UPDATE_INTERVAL);
    }).catch(() => setPhase("error"));

    return () => {
      disposed = true;
      if (updateTimer) window.clearInterval(updateTimer);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [checkForUpdate]);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setInstallPrompt(null);
    }
  }

  function dismissInstall() {
    localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    setInstallDismissed(true);
  }

  async function updateApp() {
    const registration = registrationRef.current;
    setPhase("updating");
    reloadRequested.current = true;

    try {
      await registration?.update();
      const waitingWorker = registration ? await waitForWaitingWorker(registration) : null;
      if (waitingWorker) {
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
        window.setTimeout(() => window.location.reload(), 4500);
        return;
      }
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }

  const value: PwaContextValue = {
    availableVersion,
    clientVersion,
    dismissInstall,
    installApp,
    installAvailable: Boolean(installPrompt),
    installDismissed,
    installed,
    isIos,
    phase,
    updateApp,
  };

  return (
    <PwaContext.Provider value={value}>
      {children}
      <PwaNotice />
    </PwaContext.Provider>
  );
}

function usePwa() {
  const context = useContext(PwaContext);
  if (!context) throw new Error("PwaControl doit être utilisé dans PwaProvider");
  return context;
}

export function PwaControl({ variant = "compact" }: { variant?: "compact" | "panel" }) {
  const pwa = usePwa();
  const updateAvailable = pwa.phase === "update-available" || pwa.phase === "updating";
  const canInstall = pwa.installAvailable && !pwa.installed;

  if (variant === "compact") {
    if (pwa.phase === "unsupported") return null;
    if (updateAvailable) {
      return (
        <button className="button button--pwa-update" type="button" onClick={() => void pwa.updateApp()} disabled={pwa.phase === "updating"}>
          <RefreshCw size={16} aria-hidden="true" />
          <span>{pwa.phase === "updating" ? "Mise à jour…" : "Mettre à jour"}</span>
        </button>
      );
    }
    if (canInstall) {
      return (
        <button className="button button--ghost pwa-compact" type="button" onClick={() => void pwa.installApp()}>
          <Download size={16} aria-hidden="true" /><span>Installer</span>
        </button>
      );
    }
    return (
      <span className="pwa-version-chip" title={`Application à jour — ${pwa.clientVersion}`}>
        {pwa.phase === "offline" ? <CloudOff size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
        <span>{pwa.phase === "offline" ? "Hors connexion" : shortVersion(pwa.clientVersion)}</span>
      </span>
    );
  }

  let title = "Application à jour";
  let description = `${shortVersion(pwa.clientVersion)} · Vérification automatique activée`;
  let icon = <CheckCircle2 size={20} aria-hidden="true" />;
  let action: ReactNode = null;

  if (updateAvailable) {
    title = pwa.phase === "updating" ? "Installation en cours" : "Mise à jour disponible";
    description = shortVersion(pwa.availableVersion);
    icon = <RefreshCw size={20} aria-hidden="true" />;
    action = <button type="button" onClick={() => void pwa.updateApp()} disabled={pwa.phase === "updating"}>{pwa.phase === "updating" ? "Patientez…" : "Mettre à jour"}</button>;
  } else if (canInstall) {
    title = "Installer Constellation";
    description = "Ajoutez le studio à votre écran d’accueil.";
    icon = <Smartphone size={20} aria-hidden="true" />;
    action = <button type="button" onClick={() => void pwa.installApp()}>Installer</button>;
  } else if (pwa.isIos && !pwa.installed) {
    title = "Installer sur iPhone";
    description = "Touchez Partager, puis « Sur l’écran d’accueil ».";
    icon = <Share2 size={20} aria-hidden="true" />;
  } else if (pwa.installed) {
    title = "Application installée et à jour";
  } else if (pwa.phase === "offline") {
    title = "Vous êtes hors connexion";
    description = `${shortVersion(pwa.clientVersion)} · Vos devis locaux restent conservés.`;
    icon = <CloudOff size={20} aria-hidden="true" />;
  }

  return (
    <section className="pwa-panel" aria-label="État de l’application">
      <span className="pwa-panel-icon">{icon}</span>
      <span><strong>{title}</strong><small>{description}</small></span>
      {action}
    </section>
  );
}

function PwaNotice() {
  const pwa = usePwa();
  const updateAvailable = pwa.phase === "update-available" || pwa.phase === "updating";
  const showInstall = !pwa.installDismissed
    && !pwa.installed
    && (pwa.installAvailable || pwa.isIos)
    && !updateAvailable;

  if (!updateAvailable && !showInstall) return null;

  return (
    <aside className={`pwa-notice ${updateAvailable ? "pwa-notice--update" : ""}`} role="status">
      <span className="pwa-notice-icon">{updateAvailable ? <RefreshCw size={20} aria-hidden="true" /> : <Smartphone size={20} aria-hidden="true" />}</span>
      <span className="pwa-notice-copy">
        <strong>{updateAvailable ? "Une nouvelle version est prête" : "Installez Constellation"}</strong>
        <small>{updateAvailable ? `${shortVersion(pwa.availableVersion)} · Vos devis seront conservés.` : pwa.isIos && !pwa.installAvailable ? "Partager → Sur l’écran d’accueil" : "Accédez au studio comme à une vraie application."}</small>
      </span>
      {updateAvailable ? (
        <button className="pwa-notice-action" type="button" onClick={() => void pwa.updateApp()} disabled={pwa.phase === "updating"}>{pwa.phase === "updating" ? "Installation…" : "Mettre à jour"}</button>
      ) : pwa.installAvailable ? (
        <button className="pwa-notice-action" type="button" onClick={() => void pwa.installApp()}>Installer</button>
      ) : (
        <button className="pwa-notice-action" type="button" onClick={pwa.dismissInstall}>Compris</button>
      )}
      {!updateAvailable && <button className="pwa-notice-close" type="button" onClick={pwa.dismissInstall} aria-label="Masquer la proposition d’installation"><X size={17} aria-hidden="true" /></button>}
    </aside>
  );
}
