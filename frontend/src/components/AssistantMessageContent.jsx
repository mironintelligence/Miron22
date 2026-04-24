import React from "react";
import ReactMarkdown from "react-markdown";

/**
 * Okunabilir asistan metni: başlık, liste, kalın = altın, italik = açık beyaz.
 * Akış sırasında markdown yarım kalmasın diye düz metin + imleç.
 */
export default function AssistantMessageContent({ text, streaming }) {
  if (streaming) {
    return (
      <div className="text-[15px] leading-[1.75]" style={{ color: "#e8e8e8" }}>
        <span className="whitespace-pre-wrap break-words" style={{ fontFamily: "IBM Plex Sans, system-ui, sans-serif" }}>
          {text}
        </span>
        <span
          className="ml-0.5 inline-block align-middle"
          style={{
            width: 2,
            minHeight: 16,
            background: "#FFD700",
            animation: "asstCaret 0.8s ease-in-out infinite",
          }}
          aria-hidden
        />
        <style>{`@keyframes asstCaret{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
      </div>
    );
  }

  return (
    <div
      className="max-w-none text-[15px] leading-[1.75]"
      style={{ fontFamily: "IBM Plex Sans, system-ui, sans-serif", color: "#e8e8e8" }}
    >
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0" style={{ color: "#e8e8e8" }}>{children}</p>,
          strong: ({ children }) => <strong style={{ color: "#FFD700", fontWeight: 600 }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: "#f0f0f0", fontStyle: "normal" }}>{children}</em>,
          h1: ({ children }) => (
            <h1 className="mb-2 mt-4 text-lg font-semibold first:mt-0" style={{ color: "#ffffff" }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-3 text-base font-semibold" style={{ color: "#f5f5f5" }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-2 text-sm font-semibold" style={{ color: "#FFD700" }}>
              {children}
            </h3>
          ),
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1.5 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1.5 pl-5">{children}</ol>,
          li: ({ children }) => <li style={{ color: "#e5e5e5" }}>{children}</li>,
          code: ({ className, children, ...props }) => {
            const isBlock = className && String(className).includes("language-");
            if (isBlock) {
              return (
                <pre
                  className="mb-3 overflow-x-auto rounded-lg p-3"
                  style={{ background: "#0a0a0a", border: "0.5px solid #1e1e1e", fontSize: 13 }}
                >
                  <code style={{ color: "#c9a84c" }} {...props}>
                    {children}
                  </code>
                </pre>
              );
            }
            return (
              <code className="rounded px-1 py-0.5" style={{ background: "#111", color: "#FFD700", fontSize: 13 }}>
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote
              className="mb-3 border-l-2 pl-3"
              style={{ borderColor: "#FFD700", color: "#c8c8c8" }}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {text || ""}
      </ReactMarkdown>
    </div>
  );
}
