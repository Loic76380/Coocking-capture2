import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChefHat, Mail, Lock, User, ArrowRight, KeyRound } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Auth = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ email: "", password: "", firstName: "" });
  const [isLoading, setIsLoading] = useState(false);
  
  // Forgot password states
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(loginData.email, loginData.password);
      toast.success("Connexion réussie !");
      navigate("/");
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur de connexion";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await register(registerData.email, registerData.password, registerData.firstName);
      toast.success("Compte créé avec succès !");
      navigate("/");
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de l'inscription";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Veuillez entrer votre adresse email");
      return;
    }

    setIsSendingReset(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: forgotEmail });
      setResetEmailSent(true);
      toast.success("Email envoyé !");
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de l'envoi";
      toast.error(message);
    } finally {
      setIsSendingReset(false);
    }
  };

  const closeForgotPasswordDialog = () => {
    setForgotPasswordOpen(false);
    setForgotEmail("");
    setResetEmailSent(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4" data-testid="auth-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Cooking Capture</h1>
          <p className="text-stone-600 mt-2">Connectez-vous pour accéder à vos recettes</p>
        </div>

        <Card className="border-stone-200 shadow-soft">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="login-tab">Connexion</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Inscription</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent>
              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="pl-10"
                        data-testid="login-email"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Mot de passe</Label>
                      <button
                        type="button"
                        onClick={() => setForgotPasswordOpen(true)}
                        className="text-xs text-primary hover:underline"
                        data-testid="forgot-password-link"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="pl-10"
                        data-testid="login-password"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full rounded-full h-11"
                    disabled={isLoading}
                    data-testid="login-submit"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Se connecter
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              {/* Register Form */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
                  <div className="space-y-2">
                    <Label htmlFor="register-firstName">Prénom</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input
                        id="register-firstName"
                        type="text"
                        placeholder="Votre prénom"
                        value={registerData.firstName}
                        onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                        className="pl-10"
                        data-testid="register-name"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="pl-10"
                        data-testid="register-email"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="pl-10"
                        data-testid="register-password"
                        required
                        minLength={6}
                      />
                    </div>
                    <p className="text-xs text-stone-500">Minimum 6 caractères</p>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full rounded-full h-11"
                    disabled={isLoading}
                    data-testid="register-submit"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Créer mon compte
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={closeForgotPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-center font-serif text-xl">
              {resetEmailSent ? "Email envoyé !" : "Mot de passe oublié"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {resetEmailSent 
                ? "Si un compte existe avec cette adresse, vous recevrez un email avec un lien pour réinitialiser votre mot de passe."
                : "Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe."
              }
            </DialogDescription>
          </DialogHeader>
          
          {resetEmailSent ? (
            <div className="py-4 text-center">
              <p className="text-sm text-stone-600 mb-4">
                Vérifiez votre boîte de réception (et vos spams).
              </p>
              <Button onClick={closeForgotPasswordDialog} className="rounded-full">
                Retour à la connexion
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-10"
                    data-testid="forgot-email-input"
                    required
                    disabled={isSendingReset}
                  />
                </div>
              </div>
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeForgotPasswordDialog}
                  className="rounded-full"
                  disabled={isSendingReset}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="rounded-full"
                  disabled={isSendingReset}
                  data-testid="send-reset-email-btn"
                >
                  {isSendingReset ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Envoi...
                    </>
                  ) : (
                    "Envoyer le lien"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
