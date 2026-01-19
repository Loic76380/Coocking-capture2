import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Database, Trash2, Download, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4" data-testid="privacy-page">
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
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Politique de Confidentialité</h1>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              1. Données collectées
            </h2>
            <p className="text-stone-600 mb-3">
              Dans le cadre de l'utilisation de Cooking Capture, nous collectons les données suivantes :
            </p>
            <ul className="list-disc list-inside text-stone-600 space-y-1 ml-4">
              <li><strong>Données de compte :</strong> Prénom, adresse email, mot de passe (chiffré)</li>
              <li><strong>Recettes :</strong> Titre, ingrédients, étapes, images que vous ajoutez</li>
              <li><strong>Filtres personnalisés :</strong> Catégories que vous créez</li>
              <li><strong>Données techniques :</strong> Logs de connexion pour la sécurité</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Finalité du traitement</h2>
            <p className="text-stone-600 mb-3">Vos données sont utilisées pour :</p>
            <ul className="list-disc list-inside text-stone-600 space-y-1 ml-4">
              <li>Créer et gérer votre compte utilisateur</li>
              <li>Sauvegarder et afficher vos recettes personnelles</li>
              <li>Permettre l'envoi de recettes par email</li>
              <li>Assurer la sécurité et le bon fonctionnement du service</li>
            </ul>
            <p className="text-stone-600 mt-3">
              <strong>Nous ne vendons jamais vos données</strong> et ne les utilisons pas à des fins publicitaires.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Base légale</h2>
            <p className="text-stone-600">
              Le traitement de vos données repose sur votre <strong>consentement</strong> lors de 
              la création de votre compte et sur l'<strong>exécution du contrat</strong> de service 
              que vous acceptez en utilisant l'application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              4. Stockage des données
            </h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
              <p className="text-green-800 font-medium">🇫🇷 Hébergement en France</p>
              <p className="text-green-700 text-sm mt-1">
                Toutes vos données sont stockées sur des serveurs OVH situés en France. 
                Aucun transfert de données hors de l'Union Européenne n'est effectué.
              </p>
            </div>
            <p className="text-stone-600">
              Vos données sont conservées tant que votre compte est actif. En cas de suppression 
              de compte, toutes vos données sont effacées dans un délai de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              5. Stockage local (optionnel)
            </h2>
            <p className="text-stone-600 mb-3">
              Cooking Capture vous offre la possibilité de <strong>stocker vos recettes 
              localement</strong> sur votre appareil. Cette option vous permet de :
            </p>
            <ul className="list-disc list-inside text-stone-600 space-y-1 ml-4">
              <li>Consulter vos recettes même sans connexion internet</li>
              <li>Conserver une copie de vos données sur votre appareil</li>
              <li>Garder le contrôle total sur vos données personnelles</li>
            </ul>
            <p className="text-stone-600 mt-3">
              Cette option est configurable dans les <Link to="/account" className="text-primary hover:underline">paramètres de votre compte</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Vos droits (RGPD)</h2>
            <p className="text-stone-600 mb-3">
              Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants :
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Droit d'accès</p>
                  <p className="text-sm text-stone-600">Obtenir une copie de toutes vos données personnelles</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Droit de rectification</p>
                  <p className="text-sm text-stone-600">Corriger vos données si elles sont inexactes</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Droit à l'effacement</p>
                  <p className="text-sm text-stone-600">Supprimer votre compte et toutes vos données</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold text-sm">4</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Droit à la portabilité</p>
                  <p className="text-sm text-stone-600">Exporter vos données dans un format standard</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-primary" />
              7. Suppression de compte
            </h2>
            <p className="text-stone-600">
              Vous pouvez supprimer votre compte à tout moment en contactant l'administrateur 
              à l'adresse <a href="mailto:loicchampanay@gmail.com" className="text-primary hover:underline">loicchampanay@gmail.com</a>.
              La suppression entraîne l'effacement définitif de :
            </p>
            <ul className="list-disc list-inside text-stone-600 space-y-1 ml-4 mt-2">
              <li>Vos informations de compte</li>
              <li>Toutes vos recettes</li>
              <li>Toutes les images associées</li>
              <li>Vos filtres personnalisés</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Sécurité</h2>
            <p className="text-stone-600">
              Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données :
            </p>
            <ul className="list-disc list-inside text-stone-600 space-y-1 ml-4 mt-2">
              <li>Chiffrement des mots de passe (bcrypt)</li>
              <li>Connexion sécurisée HTTPS</li>
              <li>Authentification par token JWT</li>
              <li>Accès restreint aux données</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Contact</h2>
            <p className="text-stone-600">
              Pour toute question concernant cette politique ou pour exercer vos droits, 
              contactez-nous à :
            </p>
            <p className="text-primary font-medium mt-2">
              loicchampanay@gmail.com
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

export default Privacy;
