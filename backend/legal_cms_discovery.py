"""
Discovery map: legacy scattered legal UI → CMS document type.

CMS: PostgreSQL `legal_documents` + public `GET /api/legal/documents/{slug}`.
SPA: `/legal/<slug>` (ai_terms → slug `ai-terms`). Legacy `/terms`, `/privacy`,
`/user-agreement` redirect in App.jsx.

| Location | document type | Notes |
|----------|---------------|-------|
| frontend/src/pages/LegalDocument.jsx | any active slug | Renders Markdown from API |
| frontend/src/pages/Register.jsx, Kaydol.jsx | terms, privacy | Combined checkbox; `accepted_terms_and_privacy` |
| frontend/src/pages/DemoRequest.jsx | terms, privacy | Checkbox copy + `/legal/*` links |
| frontend legalPublicLinks.js | nav/footer | `LEGAL_PUBLIC_LINKS` → Navbar, Header, IntroLanding |
| frontend/src/pages/AdminPanel.jsx (tab legal) | all types | Publish / activate / audit |
| backend/legal_compliance.py | legacy hashes | Archive for old `legal_consents` |
| backend/auth_router.py register | terms, privacy | `insert_user_legal_acceptances` signup |
| backend/auth_router.py complete-registration | terms, privacy, ai_terms | + legacy `legal_consents` |
"""
