import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import LoginModal from "./components/LoginModal.jsx";
import NotificationToasts from "./components/NotificationToasts.jsx";
import GlobalToast from "./components/GlobalToast.jsx";
import PaymentGate from "./pages/PaymentGate.jsx";
import Home from "./pages/Home.jsx";
import Analyze from "./pages/Analyze.jsx";
import LibraAssistant from "./components/LibraAssistant.jsx";
import Pleadings from "./pages/Pleadings.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Settings from "./pages/Settings.jsx";
import Register from "./pages/Register.jsx";
import Pricing from "./pages/Pricing.jsx";
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
import AdminPanel from "./pages/AdminPanel.jsx";
import Welcome from "./pages/Welcome.jsx";
import CaseSimulation from "./pages/CaseSimulation.jsx";
import Contracts from "./pages/Contracts.jsx"; // YENİ
import AdminRoute from "./components/AdminRoute.jsx";
import Notifications from "./pages/Notifications.jsx"; // YENİ
import About from "./pages/About.jsx"; // YENİ
import Upgrade from "./pages/Upgrade.jsx";
import Reminders from "./pages/Reminders.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";

import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import { useAuth } from "./auth/AuthProvider";

export default function App() {
  const { status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (location.pathname === "/login") {
      if (status === "authed") {
        navigate("/home", { replace: true });
        return;
      }
      setLoginOpen(true);
    }
  }, [location.pathname, status, navigate]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar /> {/* Header yerine Navbar */}
      <NotificationToasts />
      <GlobalToast />
      <LoginModal
        open={loginOpen}
        onClose={() => {
          setLoginOpen(false);
          if (location.pathname === "/login") {
            navigate("/", { replace: true });
          }
        }}
        onSuccess={() => {
          setLoginOpen(false);
          navigate("/welcome", { replace: true });
        }}
      />

      <div className="pt-24 pb-20"> {/* Global navbar/footer safe spacing */}
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
            path="/contracts"
            element={
              <ProtectedRoute>
                <Contracts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/templates"
            element={
              <ProtectedRoute>
                <Contracts forcedTab="templates" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/analysis"
            element={
              <ProtectedRoute>
                <Contracts forcedTab="analyze" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reminders"
            element={
              <ProtectedRoute>
                <Reminders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/welcome"
            element={
              <ProtectedRoute>
                <Welcome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complete-payment"
            element={
              <ProtectedRoute>
                <PaymentGate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upgrade"
            element={
              <ProtectedRoute>
                <Upgrade />
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
            path="/case-simulation"
            element={
              <ProtectedRoute>
                <CaseSimulation />
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
          <Route
            path="/simulation"
            element={
              <ProtectedRoute>
                <CaseSimulation />
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
          <Route path="/login" element={<IntroLanding />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/unauthorized"
            element={
              <ProtectedRoute>
                <Unauthorized />
              </ProtectedRoute>
            }
          />


         
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/user-agreement" element={<UserAgreement />} />

          {/* FALLBACK */}
          <Route
            path="*"
            element={
              status === "authed" ? (
                <Navigate to="/home" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </div>

      <footer className="fixed bottom-0 left-0 w-full text-center text-xs py-3 bg-black/40 backdrop-blur-xl border-t border-white/10 text-white/70 pointer-events-none">
        ⚠ Yapay zekâ hatalı bilgi verebilir. Önemli kararlar öncesi doğruluğu lütfen kontrol edin.
      </footer>
    </div>
  );
}
