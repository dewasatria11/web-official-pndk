-- Create payment_settings table
CREATE TABLE IF NOT EXISTS payment_settings (
    id INT PRIMARY KEY DEFAULT 1,
    bank_name TEXT DEFAULT 'Bank BRI',
    bank_account TEXT DEFAULT '1234-5678-9012',
    bank_holder TEXT DEFAULT 'Yayasan Al Ikhsan Beji',
    nominal NUMERIC DEFAULT 250000,
    qris_image_url TEXT,
    qris_nominal NUMERIC DEFAULT 250000,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default row if not exists
INSERT INTO payment_settings (id, bank_name, bank_account, bank_holder, nominal, qris_nominal)
VALUES (1, 'Bank BRI', '1234-5678-9012', 'Yayasan Al Ikhsan Beji', 250000, 250000)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read (Anyone can see payment info)
CREATE POLICY "Public Read Payment Settings"
ON payment_settings FOR SELECT
USING (true);

-- Policy: Admin Update (Only authenticated admins can update)
-- Assuming admin has a specific role or we use service_role key for updates from admin API
-- For now, we'll allow public read, but writes should be protected by application logic or specific role.
-- Since we use service_role in admin handlers, we can leave RLS as is for now (implicit deny for anon write).
