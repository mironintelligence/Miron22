-- Users Tablosu Güncellemeleri (Doğrulama, Şifre Sıfırlama)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS enterprise_inquiry BOOLEAN DEFAULT FALSE;

-- Bildirimler Tablosu (Admin ve Sistem Bildirimleri)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'system', 'admin', 'case_reminder'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sözleşme Şablonları (Admin tarafından yönetilebilir)
CREATE TABLE IF NOT EXISTS contract_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Kira', 'İş', 'Ticari' vs.
    content TEXT NOT NULL, -- Şablon metni (Placeholderlar ile örn: {{ad_soyad}})
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kullanıcı Sözleşmeleri (Analiz edilmiş veya oluşturulmuş)
CREATE TABLE IF NOT EXISTS user_contracts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    original_content TEXT, -- Analiz edilen metin
    analysis_result JSONB, -- AI Analiz sonucu (Güçlü/Zayıf yönler)
    generated_content TEXT, -- Oluşturulan metin
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler (Performans için)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_contract_templates_category ON contract_templates(category);
