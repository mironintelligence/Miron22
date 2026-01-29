import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import Analyze from "./pages/Analyze.jsx";
import LibraAssistant from "./components/LibraAssistant.jsx";
import Pleadings from "./pages/Pleadings.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Settings from "./pages/Settings.jsx";
import Register from "./pages/Register.jsx";
import Pricing from "./pages/Pricing.jsx";
import Login from "./pages/Login.jsx";
import RiskStrategy from "./pages/RiskStrategy";
import Intro from "./pages/Intro.jsx";
import IntroLanding from "./pages/IntroLanding.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Privacy from "./pages/Privacy.jsx";
import Terms from "./pages/Terms.jsx";
import DemoRequest from "./pages/DemoRequest.jsx";
import Demos from "./pages/Demos.jsx";
import YargitaySearch from "./pages/YargitaySearch";
import Mevzuat from "./pages/Mevzuat";
import Feedback from "./pages/Feedback";
import UserAgreement from "./pages/UserAgreement";
import GuestRoute from "./components/GuestRoute.jsx";
import Calculators from "./pages/Calculators";

import { isAuthenticated } from "./utils/auth";

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-gradient-to-br from-[#0b0b0c] to-[#17181b] text-gray-100"
          : "bg-gradient-to-br from-white to-gray-100 text-gray-900"
      }`}
    >
      <Header darkMode={darkMode} setDarkMode={setDarkMode} />

      <div className="px-6 sm:px-10 md:px-12 lg:px-16">
        <Routes>
          <Route path="/demo-request" element={<DemoRequest />} />

          {/* GİRİŞLİ KULLANICI "/"a GİDEMEZ -> /home */}
          <Route
            path="/"
            element={
              <GuestRoute>
                <IntroLanding />
              </GuestRoute>
            }
          />

          <Route path="/intro" element={<Intro />} />

          {/* PROTECTED ROUTES */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyze"
            element={
              <ProtectedRoute>
                <Analyze />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute>
                <LibraAssistant show />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pleadings"
            element={
              <ProtectedRoute>
                <Pleadings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk"
            element={
              <ProtectedRoute>
                <RiskStrategy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/demos"
            element={
              <ProtectedRoute>
                <Demos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calculators"
            element={
              <ProtectedRoute>
                <Calculators />
              </ProtectedRoute>
            }
          />
          <Route
            path="/yargitay"
            element={
              <ProtectedRoute>
                <YargitaySearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mevzuat"
            element={
              <ProtectedRoute>
                <Mevzuat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <Feedback />
              </ProtectedRoute>
            }
          />

          {/* PUBLIC / GUEST ONLY */}
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route path="/pricing" element={<Pricing />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />


                 <Route path="/feedback" element={<Feedback />} />
          <Route
            path="/feedback"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />


         
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/user-agreement" element={<UserAgreement />} />

          {/* FALLBACK */}
          <Route
            path="*"
            element={
              isAuthenticated() ? (
                <Navigate to="/home" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </div>

      <footer className="fixed bottom-0 left-0 w-full text-center text-xs py-3 bg-white/10 dark:bg-black/30 backdrop-blur-xl border-t border-white/10 text-gray-300">
        ⚠ Yapay zekâ hatalı bilgi verebilir. Önemli kararlar öncesi doğruluğu lütfen kontrol edin.
      </footer>
    </div>
  );
}