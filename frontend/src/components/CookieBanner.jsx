import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const COOKIE_CONSENT_KEY = "cooking_capture_cookie_consent";

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-stone-200 p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          {/* Icon & Text */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Cookie className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Ce site utilise des cookies</h3>
            </div>
            <p className="text-sm text-stone-600 mb-3">
              Nous utilisons uniquement des <strong>cookies techniques essentiels</strong> pour :
            </p>
            <ul className="text-sm text-stone-600 space-y-1 mb-3">
              <li className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-primary" />
                <span><strong>Maintenir votre connexion</strong> (ne pas vous reconnecter à chaque visite)</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-primary" />
                <span><strong>Sauvegarder vos préférences</strong> et permettre l'accès hors-ligne</span>
              </li>
            </ul>
            <p className="text-xs text-stone-500">
              🚫 Aucun cookie publicitaire ou de tracking. 
              <Link to="/privacy" className="text-primary hover:underline ml-1">
                En savoir plus →
              </Link>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="flex-1 md:flex-none rounded-full"
            >
              Refuser
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 md:flex-none rounded-full"
              data-testid="accept-cookies-btn"
            >
              Accepter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
