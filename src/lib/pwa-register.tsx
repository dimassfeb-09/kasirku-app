"use client";

import * as React from "react";

interface PWAContextValue {
  isOnline: boolean;
  canInstall: boolean;
  installApp: () => void;
}

const PWAContext = React.createContext<PWAContextValue>({
  isOnline: true,
  canInstall: false,
  installApp: () => {},
});

export function usePWA() {
  return React.useContext(PWAContext);
}

export function PWARegister({ children }: { children?: React.ReactNode }) {
  const [isOnline, setIsOnline] = React.useState(() => navigator.onLine);
  const [canInstall, setCanInstall] = React.useState(false);
  const deferredPrompt = React.useRef<Event | null>(null);

  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setCanInstall(true);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstall);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstall);
    };
  }, []);

  const installApp = React.useCallback(async () => {
    const prompt = deferredPrompt.current as unknown as
      | { prompt: () => Promise<void>; outcome?: string }
      | null;
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.outcome;
    if (result === "accepted") {
      setCanInstall(false);
    }
    deferredPrompt.current = null;
  }, []);

  return (
    <PWAContext.Provider value={{ isOnline, canInstall, installApp }}>
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 shadow-lg">
          Tidak ada koneksi internet
        </div>
      )}
      {canInstall && (
        <div className="fixed bottom-16 left-4 z-50 flex items-center gap-2 rounded-lg border bg-white px-4 py-3 shadow-lg">
          <span className="text-sm">Install Kasirku</span>
          <button
            onClick={installApp}
            className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
          >
            Install
          </button>
          <button
            onClick={() => setCanInstall(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Tutup
          </button>
        </div>
      )}
      {children}
    </PWAContext.Provider>
  );
}
