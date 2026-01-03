import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import Directory from "@/pages/Directory";
import RecipeDetail from "@/pages/RecipeDetail";
import Navbar from "@/components/Navbar";
import InstallPWA from "@/components/InstallPWA";

function App() {
  return (
    <div className="App min-h-screen bg-background">
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/recipe/:id" element={<RecipeDetail />} />
          </Routes>
        </main>
        <Toaster position="bottom-right" richColors />
        <InstallPWA />
      </BrowserRouter>
    </div>
  );
}

export default App;
