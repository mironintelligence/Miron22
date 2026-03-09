-- 013_hotel_management_schema.sql
-- Hotel Management System Schema

-- 1. Hotel Requests (Applications)
CREATE TABLE IF NOT EXISTS hotel_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_name TEXT NOT NULL,
    city TEXT NOT NULL,
    monthly_customer_count INTEGER,
    reason TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Hotels (Approved Entities)
CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update Users Table for Roles and Hotel Association
-- Adding columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hotel_id') THEN
        ALTER TABLE users ADD COLUMN hotel_id UUID REFERENCES hotels(id);
    END IF;
END $$;

-- 4. RLS Policies

-- Hotel Requests: Public insert, Admin view
ALTER TABLE hotel_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit requests" ON hotel_requests
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can view requests" ON hotel_requests
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Admins can update requests" ON hotel_requests
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- Hotels: Public read (for landing?), Admin write
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view hotels" ON hotels
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Admins can manage hotels" ON hotels
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));
