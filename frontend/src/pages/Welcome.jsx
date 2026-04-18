import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

/** Kısa geçiş: giriş sonrası /welcome → /dashboard (ekstra metin yok). */
export default function Welcome() {
  const navigate = useNavigate();
  const { consumeLastLoginMeta } = useAuth();

  useEffect(() => {
    consumeLastLoginMeta?.();
    navigate("/dashboard", { replace: true });
  }, [navigate, consumeLastLoginMeta]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-subtle text-sm">
      Yönlendiriliyor…
    </div>
  );
}
