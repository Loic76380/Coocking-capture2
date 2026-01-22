import { Link } from "react-router-dom";
import { Heart, Coffee } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full py-6 mt-auto border-t border-stone-200/50 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-4">
        {/* Ko-fi Button */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-stone-500">
            Vous aimez cette application ?
          </p>
          <a
            href="https://ko-fi.com/coocking_app_dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF5E5B] hover:bg-[#e54543] text-white font-medium rounded-full transition-all hover:scale-105 shadow-md hover:shadow-lg"
            data-testid="kofi-button"
          >
            <Coffee className="w-5 h-5" />
            <span>Offrez-moi un café</span>
            <Heart className="w-4 h-4 animate-pulse" />
          </a>
        </div>

        {/* Legal Links */}
        <div className="flex items-center gap-4 text-sm text-stone-500">
          <Link to="/contact" className="hover:text-primary transition-colors">
            Contact
          </Link>
          <span>•</span>
          <Link to="/legal" className="hover:text-primary transition-colors">
            Mentions légales
          </Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-primary transition-colors">
            Politique de confidentialité
          </Link>
        </div>

        <p className="text-xs text-stone-400">
          © {new Date().getFullYear()} Cooking Capture - Votre assistant culinaire
        </p>
      </div>
    </footer>
  );
};

export default Footer;
