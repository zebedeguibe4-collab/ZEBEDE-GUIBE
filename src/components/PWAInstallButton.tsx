import React, {useState} from 'react';
import {
  Smartphone,
  Download,
  Share,
  X,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : '';

  const copyValue = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {!isInstalled && isInstallable && (
          <button
            type="button"
            onClick={install}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-700 text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Installer l’app mobile
          </button>
        )}

        {!isInstalled && !isInstallable && isIOS && (
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-700 text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share className="w-3.5 h-3.5" />
            Installer sur iPhone / iPad
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowGuideModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-teal-700" />
          App Mobile & Play Store
        </button>
      </div>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-playstore-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-teal-700" />
                <h2
                  id="pwa-playstore-title"
                  className="font-display text-base font-bold text-slate-900"
                >
                  Application Mobile CSPLZ & Publication Play Store
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-sm text-slate-700">
              {/* Direct install status */}
              <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/70 space-y-2">
                <div className="flex items-center gap-2 font-display font-bold text-xs text-teal-900">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  Application Web Progressive (PWA) & Hors-Ligne prête
                </div>
                <p className="text-xs text-teal-900/90 leading-relaxed">
                  Manifeste Web, icônes Android 192×192 / 512×512 (avec marge maskable), icône iOS et Service Worker hors-ligne sont actifs.
                </p>
                {!isInstalled && isInstallable && (
                  <button
                    type="button"
                    onClick={install}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md bg-teal-700 text-white hover:bg-teal-800 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Installer maintenant sur cet appareil
                  </button>
                )}
              </div>

              {/* Installation sur smartphone */}
              <div className="space-y-2">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
                  1. Installation directe sur Android & iOS
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-5">
                  <li>
                    <strong className="text-slate-800">Android (Chrome) :</strong> ouvrez le lien de l’application et appuyez sur <em>« Installer l’app mobile »</em> (ou menu ⋮ → <em>Installer l’application</em>).
                  </li>
                  <li>
                    <strong className="text-slate-800">iPhone / iPad (Safari) :</strong> appuyez sur le bouton <em>Partager</em> en bas de l’écran, puis sur <em>« Sur l’écran d’accueil »</em>.
                  </li>
                </ul>
              </div>

              {/* Play Store packaging */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
                  2. Générer le package Play Store (.aab / .apk) via TWA
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cette application inclut le manifeste officiel et le fichier <code className="font-mono text-slate-800">/.well-known/assetlinks.json</code> nécessaires pour générer un package Android natif (Trusted Web Activity) publiable sur Google Play Console :
                </p>

                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">URL de l’app publiée :</span>
                    <button
                      type="button"
                      onClick={() => copyValue(currentOrigin, 'url')}
                      className="inline-flex items-center gap-1 font-mono text-teal-700 hover:underline cursor-pointer"
                    >
                      {copiedKey === 'url' ? 'Copié' : 'Copier URL'}
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-slate-900 truncate">
                    {currentOrigin}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                    <span className="text-slate-600">ID Package Android :</span>
                    <span className="font-mono font-semibold text-slate-900">
                      cm.csplz.zouabi.twa
                    </span>
                  </div>
                </div>

                <ol className="space-y-1.5 text-xs text-slate-600 list-decimal pl-5">
                  <li>
                    Déployez l’application via le bouton <strong>Share / Deploy</strong> pour obtenir votre URL publique HTTPS stable.
                  </li>
                  <li>
                    Rendez-vous sur{' '}
                    <a
                      href="https://www.pwabuilder.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-700 font-semibold hover:underline"
                    >
                      PWABuilder.com
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    ou utilisez <code className="font-mono">npx @bubblewrap/cli init --manifest={currentOrigin}/manifest.webmanifest</code> pour télécharger le fichier <code className="font-mono">.aab</code> signé (Play Store) et <code className="font-mono">.apk</code> (installation directe).
                  </li>
                  <li>
                    Copiez l’empreinte <strong>SHA-256</strong> fournie par Google Play Console dans <code className="font-mono">public/.well-known/assetlinks.json</code> pour masquer la barre d’adresse Chrome dans l’application Play Store.
                  </li>
                </ol>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 cursor-pointer"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
