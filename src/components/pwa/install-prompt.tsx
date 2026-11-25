"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "prumo-install-dismissed";
const DISMISS_DAYS = 14;
export const OPEN_INSTALL_EVENT = "prumo:install";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function recentlyDismissed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - t < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/** Convite para instalar o Prumo como app (Android: prompt nativo; iPhone: passo a passo). */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [banner, setBanner] = useState(false);
  const [iosGuide, setIosGuide] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const iosDevice = isIOS();
    setIos(iosDevice);

    const onPrompt = (e: Event) => {
      e.preventDefault(); // guardamos para disparar quando o usuário tocar em "Instalar"
      setDeferred(e as BeforeInstallPromptEvent);
      if (!recentlyDismissed()) setTimeout(() => setBanner(true), 2500);
    };
    const onInstalled = () => {
      setBanner(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let t: ReturnType<typeof setTimeout> | undefined;
    if (iosDevice && !recentlyDismissed()) t = setTimeout(() => setBanner(true), 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (t) clearTimeout(t);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      setBanner(false);
    } else {
      setIosGuide(true);
    }
  }, [deferred]);

  // Permite abrir o fluxo a partir de outras telas (ex.: Perfil → Instalar app)
  useEffect(() => {
    const open = () => (isStandalone() ? undefined : install());
    window.addEventListener(OPEN_INSTALL_EVENT, open);
    return () => window.removeEventListener(OPEN_INSTALL_EVENT, open);
  }, [install]);

  const dismiss = () => {
    setBanner(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* armazenamento indisponível */
    }
  };

  return (
    <>
      {banner && (deferred || ios) && (
        <div className="fixed inset-x-3 top-[calc(72px+env(safe-area-inset-top))] z-40 animate-slide-up lg:top-auto lg:right-6 lg:bottom-6 lg:left-auto lg:w-[360px]">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-pop">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Instale o Prumo</p>
              <p className="text-xs text-muted">Acesso rápido pela tela inicial, em tela cheia.</p>
            </div>
            <Button size="sm" onClick={install}>
              <Download className="h-3.5 w-3.5" /> Instalar
            </Button>
            <button onClick={dismiss} className="rounded-lg p-1 text-muted hover:bg-subtle" aria-label="Agora não">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <Modal
        open={iosGuide}
        onClose={() => setIosGuide(false)}
        title={ios ? "Instalar no iPhone" : "Instalar no celular"}
        description={ios ? "Leva 10 segundos — use o Safari." : "Leva 10 segundos — use o Chrome."}
        size="sm"
      >
        <ol className="space-y-4 pb-2">
          {(ios
            ? [
                { icon: <Share className="h-5 w-5 text-brand" />, text: <>Toque no botão <b>Compartilhar</b> na barra do Safari (o quadrado com a seta para cima).</> },
                { icon: <SquarePlus className="h-5 w-5 text-brand" />, text: <>Role a lista e toque em <b>Adicionar à Tela de Início</b>.</> },
                { icon: <span className="text-sm font-bold text-brand">OK</span>, text: <>Toque em <b>Adicionar</b>. O ícone do Prumo aparece na sua tela inicial.</> },
              ]
            : [
                { icon: <span className="text-lg font-bold text-brand">⋮</span>, text: <>Toque no menu <b>⋮</b> no canto superior direito do Chrome.</> },
                { icon: <SquarePlus className="h-5 w-5 text-brand" />, text: <>Toque em <b>Instalar app</b> (ou <b>Adicionar à tela inicial</b>).</> },
                { icon: <span className="text-sm font-bold text-brand">OK</span>, text: <>Confirme em <b>Instalar</b>. O Prumo aparece junto dos seus apps.</> },
              ]
          ).map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft">{s.icon}</span>
              <p className="pt-1.5 text-sm">
                <span className="mr-1 font-semibold text-muted">{i + 1}.</span>
                {s.text}
              </p>
            </li>
          ))}
        </ol>
        {ios && <p className="mt-2 rounded-xl bg-subtle px-3 py-2 text-xs text-muted">No Chrome do iPhone, o botão Compartilhar fica no canto superior direito.</p>}
      </Modal>
    </>
  );
}
