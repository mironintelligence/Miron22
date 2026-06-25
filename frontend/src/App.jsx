import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import LoginModal from "./components/LoginModal.jsx";
import NotificationToasts from "./components/NotificationToasts.jsx";
import GlobalToast from "./components/GlobalToast.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import GuestRoute from "./components/GuestRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import LegalAcceptanceModal from "./components/LegalAcceptanceModal.jsx";
import { SitePageFooter } from "./components/SiteLegalFooter.jsx";
import CookieConsent from "./components/CookieConsent.jsx";
import { useAuth } from "./auth/AuthProvider";

// Route-level code splitting. Every page is its own async chunk so the initial
// visit only downloads what the user actually renders (landing or dashboard).
// Heavy dependencies (recharts, react-markdown) are lazy-loaded transitively.
const PaymentGate = lazy(() => import("./pages/PaymentGate.jsx"));
const Home = lazy(() => import("./pages/Home.jsx"));
const Analyze = lazy(() => import("./pages/Analyze.jsx"));
const LibraAssistant = lazy(() => import("./components/LibraAssistant.jsx"));
const Pleadings = lazy(() => import("./pages/Pleadings.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Kaydol = lazy(() => import("./pages/Kaydol.jsx"));
const DenemeBaslat = lazy(() => import("./pages/DenemeBaslat.jsx"));
const Pricing = lazy(() => import("./pages/Pricing.jsx"));
const RiskStrategy = lazy(() => import("./pages/RiskStrategy"));
const Intro = lazy(() => import("./pages/Intro.jsx"));
const IntroLanding = lazy(() => import("./pages/IntroLanding.jsx"));
const LegalDocument = lazy(() => import("./pages/LegalDocument.jsx"));
const YargitaySearch = lazy(() => import("./pages/YargitaySearch"));
const Mevzuat = lazy(() => import("./pages/Mevzuat"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Calculators = lazy(() => import("./pages/Calculators"));
const AdminPanel = lazy(() => import("./pages/AdminPanel.jsx"));
const Welcome = lazy(() => import("./pages/Welcome.jsx"));
const CaseSimulation = lazy(() => import("./pages/CaseSimulation.jsx"));
const Contracts = lazy(() => import("./pages/Contracts.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Upgrade = lazy(() => import("./pages/Upgrade.jsx"));
const Reminders = lazy(() => import("./pages/Reminders.jsx"));
const Unauthorized = lazy(() => import("./pages/Unauthorized.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const DavaMerkezi = lazy(() => import("./pages/dashboard/DavaMerkezi.jsx"));
const Arastirma = lazy(() => import("./pages/dashboard/Arastirma.jsx"));
const BelgeStudyosu = lazy(() => import("./pages/dashboard/BelgeStudyosu.jsx"));

// Render free tier cold-start önleyici — her 8 dakikada backend'i uyanık tutar
function useBackendKeepalive() {
  useEffect(() => {
    const ping = () => fetch("/api/health", { method: "GET", credentials: "omit" }).catch(() => {});
    ping();
    const id = setInterval(ping, 8 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
}

export default function App() {
  useBackendKeepalive();
  const { status, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [legalPending, setLegalPending] = useState(null);

  useEffect(() => {
    const onLegal = (ev) => {
      const ctx = ev?.detail?.context || {};
      const pending = ctx.pending_documents;
      if (Array.isArray(pending) && pending.length) {
        setLegalPending(pending);
      }
    };
    window.addEventListener("miron:legal-acceptance-required", onLegal);
    return () => window.removeEventListener("miron:legal-acceptance-required", onLegal);
  }, []);

  useEffect(() => {
    if (location.pathname === "/login") {
      setLoginOpen(false);
      return;
    }
    setLoginOpen(false);
  }, [location.pathname, status, navigate]);

  const fullscreenRoute = location.pathname === "/dashboard/assistant";

  const hideFlowPageFooter =
    fullscreenRoute ||
    location.pathname === "/login" ||
    location.pathname.startsWith("/legal/");

  /** Giriş sonrası sabit uyarı çubuğu; ana menü (/dashboard) ve tam ekran asistan hariç. */
  const showAuthedAiDisclaimerBar =
    status === "authed" && !fullscreenRoute && location.pathname !== "/dashboard";

  useEffect(() => {
    if (!fullscreenRoute) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [location.pathname, fullscreenRoute]);

  return (
    <div className={fullscreenRoute ? "h-screen w-screen overflow-hidden bg-black text-white" : "min-h-screen bg-black text-white"}>
      {!fullscreenRoute && <Navbar />}
      <LegalAcceptanceModal
        open={status === "authed" && !!legalPending}
        pendingDocuments={legalPending}
        onResolved={async () => {
          setLegalPending(null);
          try {
            await refreshUser();
          } catch {
            /* ignore */
          }
        }}
      />
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
          navigate("/dashboard", { replace: true });
        }}
      />

      <div
        className={`${fullscreenRoute ? "h-screen w-screen overflow-hidden" : ""} ${showAuthedAiDisclaimerBar ? "pb-16 sm:pb-[4.5rem]" : ""}`}
        style={fullscreenRoute ? {} : { paddingTop: 68 }}
      >
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route
              path="/"
              element={
                <GuestRoute>
                  <IntroLanding />
                </GuestRoute>
              }
            />
            <Route path="/intro" element={<Intro />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/dava-merkezi"
              element={
                <ProtectedRoute>
                  <DavaMerkezi />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/arastirma"
              element={
                <ProtectedRoute>
                  <Arastirma />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/belge-studyosu"
              element={
                <ProtectedRoute>
                  <BelgeStudyosu />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts"
              element={
                <ProtectedRoute>
                  <Contracts pageMode="builder" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/builder"
              element={
                <ProtectedRoute>
                  <Contracts pageMode="builder" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/templates"
              element={
                <ProtectedRoute>
                  <Navigate to="/contracts/builder" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contracts/analysis"
              element={
                <ProtectedRoute>
                  <Contracts pageMode="analysis" />
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
              path="/dashboard/assistant"
              element={
                <ProtectedRoute>
                  <LibraAssistant />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assistant"
              element={
                <ProtectedRoute>
                  <Navigate to="/dashboard/assistant" replace />
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
            <Route path="/register" element={<Navigate to="/kaydol" replace />} />
            <Route
              path="/kaydol"
              element={
                <GuestRoute>
                  <Kaydol />
                </GuestRoute>
              }
            />
            <Route path="/deneme-baslat" element={<DenemeBaslat />} />
            <Route
              path="/sozlesme-analizi"
              element={
                <ProtectedRoute>
                  <Navigate to="/contracts/analysis" replace />
                </ProtectedRoute>
              }
            />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
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
            <Route path="/legal/:slug" element={<LegalDocument />} />
            <Route path="/privacy" element={<Navigate to="/legal/privacy" replace />} />
            <Route path="/terms" element={<Navigate to="/legal/terms" replace />} />
            <Route path="/user-agreement" element={<Navigate to="/legal/terms" replace />} />
            <Route
              path="*"
              element={
                status === "authed" ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
        </Suspense>
        {!hideFlowPageFooter && <SitePageFooter />}
      </div>

      {showAuthedAiDisclaimerBar && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-amber-900/35 bg-black/90 backdrop-blur-md px-3 sm:px-5 py-2.5 text-center text-[11px] sm:text-xs text-amber-100/75 leading-snug pointer-events-none"
        >
          Yapay zekâ çıktıları hatalı veya eksik olabilir. Önemli hukuki kararlardan önce bilgiyi mutlaka doğrulayın.
        </div>
      )}
      {!showAuthedAiDisclaimerBar && <CookieConsent />}
    </div>
  );
}
