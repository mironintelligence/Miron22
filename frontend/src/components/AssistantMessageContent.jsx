import React from "react";
import ReactMarkdown from "react-markdown";

/**
 * Claude/ChatGPT tarzı okunaklı asistan: paragraf, liste, **vurgu** = altın, düz akış + imleç.
 */
export default function AssistantMessageContent({ text, streaming }) {
  const bodyStyle = {
    color: "var(--miron-text-muted)",
    fontSize: "0.9375rem",
    lineHeight: 1.7,
    letterSpacing: "0.01em",
  };

  if (streaming) {
    return (
      <div className="text-[0.9375rem] leading-[1.7]" style={bodyStyle}>
        <span className="whitespace-pre-wrap break-words" style={{ color: "var(--miron-text)" }}>
          {text}
        </span>
        <span
          className="ml-0.5 inline-block align-middle"
          style={{
            width: 2,
            minHeight: 16,
            background: "var(--miron-gold)",
            animation: "asstCaret 0.9s ease-in-out infinite",
          }}
          aria-hidden
        />
        <style>{`@keyframes asstCaret{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
      </div>
    );
  }

  return (
    <div className="max-w-none" style={bodyStyle}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-3.5 last:mb-0" style={{ color: "var(--miron-text-muted)" }}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong style={{ color: "var(--miron-gold)", fontWeight: 600, letterSpacing: "0.01em" }}>{children}</strong>
          ),
          em: ({ children }) => <em style={{ color: "var(--miron-text)", fontStyle: "normal" }}>{children}</em>,
          h1: ({ children }) => (
            <h1 className="font-heading mb-2.5 mt-1 text-lg font-normal first:mt-0" style={{ color: "var(--miron-text)" }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className="mb-2.5 mt-3 text-base font-semibold"
              style={{ color: "var(--miron-text)" }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className="mb-2.5 mt-2 text-sm font-semibold"
              style={{ color: "var(--miron-gold)" }}
            >
              {children}
            </h3>
          ),
          ul: ({ children }) => <ul className="mb-3.5 list-disc space-y-2 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3.5 list-decimal space-y-2 pl-5">{children}</ol>,
          li: ({ children }) => <li style={{ color: "var(--miron-text-muted)" }}>{children}</li>,
          code: ({ className, children, ...props }) => {
            const isBlock = className && String(className).includes("language-");
            if (isBlock) {
              return (
                <pre
                  className="mb-3.5 overflow-x-auto rounded-xl p-3"
                  style={{ background: "var(--miron-panel)", border: "1px solid var(--miron-border)", fontSize: 13 }}
                >
                  <code style={{ color: "rgba(255,215,0,0.85)" }} {...props}>
                    {children}
                  </code>
                </pre>
              );
            }
            return (
              <code
                className="rounded-md px-1.5 py-0.5"
                style={{ background: "var(--miron-panel-2)", color: "var(--miron-gold)", fontSize: 13, border: "1px solid var(--miron-border)" }}
              >
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote
              className="mb-3.5 border-l-2 pl-3.5"
              style={{ borderColor: "var(--miron-gold)", color: "var(--miron-text-subtle)" }}
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
