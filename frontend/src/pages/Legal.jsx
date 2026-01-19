import { Link } from "react-router-dom";
import { ArrowLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

const Legal = () => {
  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4" data-testid="legal-page">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Scale className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Mentions Légales</h1>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Éditeur du site</h2>
            <div className="text-stone-600 space-y-1">
              <p><strong>Nom du site :</strong> Cooking Capture</p>
              <p><strong>URL :</strong> https://coocking-capture.fr</p>
              <p><strong>Responsable de la publication :</strong> Loïc Champanay</p>
              <p><strong>Contact :</strong> loicchampanay@gmail.com</p>
              <p><strong>Statut :</strong> Particulier</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Hébergement</h2>
            <div className="text-stone-600 space-y-1">
              <p><strong>Hébergeur :</strong> OVH SAS</p>
              <p><strong>Adresse :</strong> 2 rue Kellermann, 59100 Roubaix, France</p>
              <p><strong>Téléphone :</strong> 1007 (depuis la France)</p>
              <p><strong>Site web :</strong> www.ovh.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Propriété intellectuelle</h2>
            <p className="text-stone-600">
              L'ensemble du contenu de ce site (textes, images, graphismes, logo, icônes, etc.) 
              est la propriété exclusive de Cooking Capture, à l'exception des marques, logos 
              ou contenus appartenant à d'autres sociétés partenaires ou auteurs.
            </p>
            <p className="text-stone-600 mt-2">
              Toute reproduction, distribution, modification, adaptation, retransmission ou 
              publication de ces différents éléments est strictement interdite sans l'accord 
              exprès par écrit de Cooking Capture.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Responsabilité</h2>
            <p className="text-stone-600">
              Les informations fournies sur ce site le sont à titre indicatif. Cooking Capture 
              ne saurait garantir l'exactitude, la complétude, l'actualité des informations 
              diffusées sur son site.
            </p>
            <p className="text-stone-600 mt-2">
              Les recettes extraites proviennent de sources externes. Cooking Capture ne peut 
              être tenu responsable de leur exactitude ou de leur adéquation à un régime 
              alimentaire particulier.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Données personnelles</h2>
            <p className="text-stone-600">
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous 
              disposez d'un droit d'accès, de rectification et de suppression de vos données 
              personnelles. Pour exercer ce droit, contactez-nous à l'adresse : 
              loicchampanay@gmail.com
            </p>
            <p className="text-stone-600 mt-2">
              Pour plus d'informations, consultez notre{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Politique de Confidentialité
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Cookies</h2>
            <p className="text-stone-600">
              Ce site utilise uniquement des cookies techniques nécessaires au bon 
              fonctionnement de l'application (authentification, préférences). Aucun cookie 
              publicitaire ou de tracking n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Droit applicable</h2>
            <p className="text-stone-600">
              Les présentes mentions légales sont régies par le droit français. En cas de 
              litige, les tribunaux français seront seuls compétents.
            </p>
          </section>

          <div className="pt-4 border-t border-stone-100 text-sm text-stone-500">
            Dernière mise à jour : Janvier 2026
          </div>
        </div>
      </div>
    </div>
  );
};

export default Legal;
