import React from "react";
import ReactMarkdown from "react-markdown";

/**
 * ChatGPT/Claude benzeri okunaklı metin: 16px gövde, **vurgu** = #FFD700, miron değişkenleri.
 */
export default function AssistantMessageContent({ text, streaming }) {
  const body = {
    color: "rgba(255,255,255,0.86)",
    fontSize: "1rem",
    lineHeight: 1.7,
    letterSpacing: "0.01em",
    fontFamily: "var(--font-chat-ui)",
  };

  if (streaming) {
    return (
      <div style={body}>
        <span className="whitespace-pre-wrap break-words" style={{ color: "rgba(255,255,255,0.9)" }}>
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
    <div className="max-w-none" style={body}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3.5 last:mb-0" style={{ color: "rgba(255,255,255,0.86)" }}>{children}</p>,
          strong: ({ children }) => <strong style={{ color: "var(--miron-gold)", fontWeight: 600 }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: "rgba(255,255,255,0.95)", fontStyle: "normal" }}>{children}</em>,
          h1: ({ children }) => (
            <h1 className="font-heading mb-2.5 mt-1 text-lg font-normal first:mt-0" style={{ color: "#ffffff" }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => <h2 className="mb-2.5 mt-3 text-base font-semibold text-white">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2.5 mt-2 text-sm font-semibold" style={{ color: "var(--miron-gold)" }}>{children}</h3>,
          ul: ({ children }) => <ul className="mb-3.5 list-disc space-y-2 pl-5 marker:text-white/30">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3.5 list-decimal space-y-2 pl-5 marker:text-white/40">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5" style={{ color: "rgba(255,255,255,0.86)" }}>{children}</li>,
          code: ({ className, children, ...props }) => {
            const isBlock = className && String(className).includes("language-");
            if (isBlock) {
              return (
                <pre
                  className="mb-3.5 overflow-x-auto rounded-xl p-3"
                  style={{ background: "var(--chat-bubble-user)", border: "1px solid var(--chat-hairline)", fontSize: 13 }}
                >
                  <code style={{ color: "rgba(255,215,0,0.9)" }} {...props}>
                    {children}
                  </code>
                </pre>
              );
            }
            return (
              <code
                className="rounded-md px-1.5 py-0.5"
                style={{ background: "var(--chat-bubble-user)", color: "var(--miron-gold)", fontSize: 13, border: "1px solid var(--chat-hairline)" }}
              >
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="mb-3.5 border-l-2 pl-3.5" style={{ borderColor: "var(--miron-gold)", color: "rgba(255,255,255,0.65)" }}>
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
