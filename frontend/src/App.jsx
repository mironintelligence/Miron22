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
const Privacy = lazy(() => import("./pages/Privacy.jsx"));
const Terms = lazy(() => import("./pages/Terms.jsx"));
const DemoRequest = lazy(() => import("./pages/DemoRequest.jsx"));
const Demos = lazy(() => import("./pages/Demos.jsx"));
const YargitaySearch = lazy(() => import("./pages/YargitaySearch"));
const Mevzuat = lazy(() => import("./pages/Mevzuat"));
const Feedback = lazy(() => import("./pages/Feedback"));
const UserAgreement = lazy(() => import("./pages/UserAgreement"));
const Calculators = lazy(() => import("./pages/Calculators"));
const AdminPanel = lazy(() => import("./pages/AdminPanel.jsx"));
const Welcome = lazy(() => import("./pages/Welcome.jsx"));
const CaseSimulation = lazy(() => import("./pages/CaseSimulation.jsx"));
const Contracts = lazy(() => import("./pages/Contracts.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Upgrade = lazy(() => import("./pages/Upgrade.jsx"));
const Reminders = lazy(() => import("./pages/Reminders.jsx"));
const Unauthorized = lazy(() => import("./pages/Unauthorized.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const DavaMerkezi = lazy(() => import("./pages/dashboard/DavaMerkezi.jsx"));
const Arastirma = lazy(() => import("./pages/dashboard/Arastirma.jsx"));
const BelgeStudyosu = lazy(() => import("./pages/dashboard/BelgeStudyosu.jsx"));

export default function App() {
  const { status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (location.pathname === "/login") {
      if (status === "authed") {
        navigate("/dashboard", { replace: true });
        return;
      }
      setLoginOpen(true);
      return;
    }
    setLoginOpen(false);
  }, [location.pathname, status, navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const isAssistant = location.pathname === "/dashboard/assistant";

  useEffect(() => {
    if (!isAssistant) return;
    const html = document.documentElement;
    const body = document.body;
    const ph = { overflow: html.style.overflow, height: html.style.height, overscroll: html.style.overscrollBehavior };
    const pb = { overflow: body.style.overflow, height: body.style.height };
    html.style.overflow = "hidden";
    html.style.height = "100%";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    return () => {
      html.style.overflow = ph.overflow;
      html.style.height = ph.height;
      html.style.overscrollBehavior = ph.overscroll;
      body.style.overflow = pb.overflow;
      body.style.height = pb.height;
    };
  }, [isAssistant]);

  return (
    <div
      className={
        isAssistant
          ? "flex h-[100dvh] flex-col overflow-hidden bg-[#0f0f0f] text-white"
          : "min-h-screen bg-black text-white"
      }
    >
      {!isAssistant && <Navbar />}
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
        className={isAssistant ? "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden" : "pt-20 pb-20"}
      >
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/demo-request" element={<DemoRequest />} />
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
      </div>

      {!isAssistant && (
        <footer className="pointer-events-none fixed bottom-0 left-0 w-full border-t border-white/10 bg-black/40 py-3 text-center text-xs text-white/70 backdrop-blur-xl">
          ⚠ Yapay zekâ hatalı bilgi verebilir. Önemli kararlar öncesi doğruluğu lütfen kontrol edin.
        </footer>
      )}
    </div>
  );
}
