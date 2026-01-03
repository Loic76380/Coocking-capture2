import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show banner after a delay if not dismissed before
      const dismissed = localStorage.getItem('pwa-banner-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show iOS banner if on iOS and not standalone
    if (ios && !standalone) {
      const dismissed = localStorage.getItem('pwa-banner-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  // Don't show if already installed
  if (isStandalone || !showBanner) return null;

  return (
    <div 
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-2xl shadow-float border border-stone-200 p-4 z-50 animate-slide-up"
      data-testid="pwa-install-banner"
    >
      <button 
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-stone-400 hover:text-stone-600"
        data-testid="pwa-dismiss"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">
            Installer l'application
          </h3>
          <p className="text-sm text-stone-600 mb-3">
            {isIOS 
              ? "Appuyez sur le bouton partager puis \"Sur l'écran d'accueil\""
              : "Accédez rapidement à vos recettes depuis votre écran d'accueil"
            }
          </p>
          
          {!isIOS && deferredPrompt && (
            <Button 
              onClick={handleInstall}
              className="rounded-full h-9 px-4 text-sm bg-primary hover:bg-primary/90"
              data-testid="pwa-install-button"
            >
              <Download className="w-4 h-4 mr-2" />
              Installer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
