import React from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import SEOHead from "../components/SEOHead.jsx";
import { getBlogPost } from "../data/blogPosts.js";

export default function BlogPost() {
  const { slug } = useParams();
  const post = getBlogPost(slug);

  if (!post) return <Navigate to="/blog" replace />;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "datePublished": post.date,
    "dateModified": post.date,
    "author": { "@type": "Organization", "name": "Miron AI" },
    "publisher": { "@id": "https://www.mironintelligence.com/#organization" },
    "mainEntityOfPage": { "@type": "WebPage", "@id": `https://www.mironintelligence.com/blog/${post.slug}` },
  };

  return (
    <>
      <SEOHead
        title={post.title}
        description={post.description}
        canonical={`/blog/${post.slug}`}
        schema={schema}
      />
      <div className="premium-scope min-h-screen bg-black text-white pt-24 px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <nav className="mb-10">
            <Link to="/blog" className="text-sm text-white/40 hover:text-white/70 transition-colors">
              ← Blog
            </Link>
          </nav>

          <header className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--miron-gold)]">{post.category}</span>
              <span className="text-white/25 text-xs">·</span>
              <span className="text-white/35 text-xs">{post.readTime} okuma</span>
              <span className="text-white/25 text-xs">·</span>
              <time className="text-white/35 text-xs" dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
              </time>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{post.title}</h1>
            <p className="text-white/55 text-lg leading-relaxed">{post.description}</p>
          </header>

          <div className="prose prose-invert prose-lg max-w-none
            prose-headings:font-bold prose-headings:text-white
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-white/65 prose-p:leading-relaxed prose-p:mb-5
            prose-li:text-white/65 prose-li:leading-relaxed
            prose-strong:text-white prose-strong:font-medium
            prose-a:text-[var(--miron-gold)] prose-a:no-underline hover:prose-a:underline
            prose-table:text-sm prose-th:text-white/80 prose-td:text-white/60
            prose-hr:border-white/10
          ">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          <div className="mt-16 border-t border-white/10 pt-12">
            <p className="text-white/45 text-sm mb-2">Bu konuda yapay zeka desteği almak ister misiniz?</p>
            <h2 className="text-xl font-bold mb-5">Miron AI'yı ücretsiz deneyin</h2>
            <div className="flex gap-4 flex-wrap">
              <Link
                to="/deneme-baslat"
                className="inline-block px-7 py-2.5 text-sm font-medium border border-[var(--miron-gold)] text-[var(--miron-gold)] hover:bg-[var(--miron-gold)]/8 transition-colors"
              >
                Ücretsiz dene
              </Link>
              <Link
                to="/blog"
                className="inline-block px-7 py-2.5 text-sm text-white/50 border border-white/15 hover:border-white/30 transition-colors"
              >
                Diğer yazılar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
