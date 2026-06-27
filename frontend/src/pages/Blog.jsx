import React from "react";
import { Link } from "react-router-dom";
import SEOHead from "../components/SEOHead.jsx";
import { blogPosts } from "../data/blogPosts.js";

const schema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": "https://www.mironintelligence.com/blog#blog",
  "name": "Miron AI Blog",
  "description": "Avukatlar için yapay zeka, içtihat araştırması ve hukuk teknolojisi rehberleri.",
  "url": "https://www.mironintelligence.com/blog",
  "publisher": { "@id": "https://www.mironintelligence.com/#organization" },
};

export default function Blog() {
  return (
    <>
      <SEOHead
        title="Hukuk Yapay Zeka Blog — Avukatlar İçin Rehberler"
        description="İçtihat araştırması, yapay zeka ile hukuki çalışma ve Türk hukuku rehberleri. Avukatlar için pratik bilgi."
        canonical="/blog"
        schema={schema}
      />
      <div className="premium-scope min-h-screen bg-black text-white pt-24 px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-white/30 mb-5">Blog</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Hukuk &amp; Yapay Zeka<br />
            <span style={{ background: "linear-gradient(90deg,#ebac00,#b88700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Rehberleri
            </span>
          </h1>
          <p className="text-white/55 text-lg mb-16 leading-relaxed">
            Avukatlar için yapay zeka kullanımı, içtihat araştırması ve hukuk teknolojisi üzerine pratik rehberler.
          </p>

          <div className="flex flex-col gap-10">
            {blogPosts.map((post) => (
              <article key={post.slug} className="border-t border-white/10 pt-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--miron-gold)]">{post.category}</span>
                  <span className="text-white/25 text-xs">·</span>
                  <span className="text-white/35 text-xs">{post.readTime} okuma</span>
                  <span className="text-white/25 text-xs">·</span>
                  <time className="text-white/35 text-xs" dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                  </time>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3 leading-snug">
                  <Link to={`/blog/${post.slug}`} className="hover:text-[var(--miron-gold)] transition-colors">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-white/55 leading-relaxed mb-4">{post.description}</p>
                <Link
                  to={`/blog/${post.slug}`}
                  className="text-sm text-[var(--miron-gold)] border-b border-[var(--miron-gold)]/40 hover:border-[var(--miron-gold)] transition-colors pb-0.5"
                >
                  Devamını oku →
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-20 border-t border-white/10 pt-14 text-center">
            <p className="text-white/45 mb-6 text-sm">Yazıları okumak değil, doğrudan denemek ister misiniz?</p>
            <Link
              to="/deneme-baslat"
              className="inline-block px-8 py-3 text-sm font-medium border border-[var(--miron-gold)] text-[var(--miron-gold)] hover:bg-[var(--miron-gold)]/8 transition-colors"
            >
              Ücretsiz dene
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
