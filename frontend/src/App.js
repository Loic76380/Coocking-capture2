import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Home from "@/pages/Home";
import Directory from "@/pages/Directory";
import RecipeDetail from "@/pages/RecipeDetail";
import Auth from "@/pages/Auth";
import Account from "@/pages/Account";
import ResetPassword from "@/pages/ResetPassword";
import Admin from "@/pages/Admin";
import Legal from "@/pages/Legal";
import Privacy from "@/pages/Privacy";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InstallPWA from "@/components/InstallPWA";

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

// Auth Route wrapper (redirect if already logged in)
const AuthRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppContent() {
  return (
    <div className="App min-h-screen bg-background flex flex-col">
      <BrowserRouter>
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route 
              path="/auth" 
              element={
                <AuthRoute>
                  <Auth />
                </AuthRoute>
              } 
            />
            <Route 
              path="/reset-password" 
              element={<ResetPassword />} 
            />
            <Route 
              path="/directory" 
              element={
                <ProtectedRoute>
                  <Directory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recipe/:id" 
              element={
                <ProtectedRoute>
                  <RecipeDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/account" 
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
        <Footer />
        <Toaster position="bottom-right" richColors />
        <InstallPWA />
      </BrowserRouter>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
