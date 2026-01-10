import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Lock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("form"); // "form", "success", "error"
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Lien invalide. Veuillez refaire une demande de réinitialisation.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: password
      });
      setStatus("success");
      toast.success("Mot de passe réinitialisé !");
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de la réinitialisation";
      setStatus("error");
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4" data-testid="reset-password-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Cooking Capture</h1>
        </div>

        <Card className="border-stone-200 shadow-soft">
          {status === "success" ? (
            <>
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="font-serif text-xl">Mot de passe modifié !</CardTitle>
                <CardDescription>
                  Votre mot de passe a été réinitialisé avec succès.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pt-4">
                <Button asChild className="rounded-full">
                  <Link to="/auth">
                    Se connecter
                  </Link>
                </Button>
              </CardContent>
            </>
          ) : status === "error" ? (
            <>
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <CardTitle className="font-serif text-xl">Lien expiré ou invalide</CardTitle>
                <CardDescription>
                  {errorMessage}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pt-4">
                <Button asChild className="rounded-full">
                  <Link to="/auth">
                    Retour à la connexion
                  </Link>
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="font-serif text-xl">Nouveau mot de passe</CardTitle>
                <CardDescription>
                  Choisissez un nouveau mot de passe pour votre compte.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-password-form">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        data-testid="new-password-input"
                        required
                        minLength={6}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-stone-500">Minimum 6 caractères</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        data-testid="confirm-password-input"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full rounded-full h-11"
                    disabled={isLoading || password !== confirmPassword}
                    data-testid="reset-password-submit"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Réinitialiser le mot de passe"
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <Link 
                      to="/auth" 
                      className="text-sm text-stone-600 hover:text-primary inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Retour à la connexion
                    </Link>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
