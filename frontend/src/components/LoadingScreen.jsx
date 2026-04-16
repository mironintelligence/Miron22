import React from "react";

const layoutClass = {
  full: "min-h-screen",
  guest: "min-h-[calc(100vh-10rem)]",
};

/**
 * Oturum veya sayfa bootstrap sırasında boş siyah ekran yerine gösterilir.
 */
export default function LoadingScreen({
  variant = "full",
  message = "Yükleniyor…",
  subtext = "Oturum kontrol ediliyor",
}) {
  const minH = layoutClass[variant] || layoutClass.full;
  return (
    <div className={`${minH} bg-black text-white flex items-center justify-center px-6`}>
      <div className="text-center space-y-3">
        <div className="animate-pulse text-white/60 text-sm">{message}</div>
        {subtext ? <div className="text-[11px] text-white/35">{subtext}</div> : null}
      </div>
    </div>
  );
}
