-- NFC Security Migration
-- Adds token model, anti-cloning detection, nonces, and rate limiting
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/019_nfc_security.sql

-- Step 1: Add security columns to nfc_bands table
ALTER TABLE nfc_bands
  ADD COLUMN IF NOT EXISTS security_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS token_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS binding_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_location POINT,
  ADD COLUMN IF NOT EXISTS concurrent_use_count INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS max_concurrent_uses INTEGER DEFAULT 1 NOT NULL;

-- Step 2: Create nfc_nonces table for replay attack prevention
CREATE TABLE IF NOT EXISTS nfc_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfc_band_id UUID REFERENCES nfc_bands(id) ON DELETE CASCADE NOT NULL,
  nonce TEXT NOT NULL,
  transaction_id UUID REFERENCES nfc_transactions(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(nfc_band_id, nonce)
);

-- Step 3: Create nfc_usage_sessions table for cloning detection
CREATE TABLE IF NOT EXISTS nfc_usage_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfc_band_id UUID REFERENCES nfc_bands(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  location POINT,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMPTZ,
  transaction_count INTEGER DEFAULT 0 NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 4: Create nfc_rate_limits table for rate limiting
CREATE TABLE IF NOT EXISTS nfc_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfc_band_id UUID REFERENCES nfc_bands(id) ON DELETE CASCADE NOT NULL UNIQUE,
  window_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  request_count INTEGER DEFAULT 0 NOT NULL,
  max_requests INTEGER DEFAULT 10 NOT NULL,
  window_duration_seconds INTEGER DEFAULT 60 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nfc_bands_security_token 
  ON nfc_bands(security_token) 
  WHERE security_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfc_bands_token_expires 
  ON nfc_bands(token_expires_at) 
  WHERE token_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfc_nonces_band_id 
  ON nfc_nonces(nfc_band_id);

CREATE INDEX IF NOT EXISTS idx_nfc_nonces_nonce 
  ON nfc_nonces(nonce);

CREATE INDEX IF NOT EXISTS idx_nfc_nonces_transaction_id 
  ON nfc_nonces(transaction_id) 
  WHERE transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfc_usage_sessions_band_id 
  ON nfc_usage_sessions(nfc_band_id, started_at);

CREATE INDEX IF NOT EXISTS idx_nfc_usage_sessions_active 
  ON nfc_usage_sessions(nfc_band_id, started_at) 
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_nfc_usage_sessions_token 
  ON nfc_usage_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_nfc_rate_limits_band_id 
  ON nfc_rate_limits(nfc_band_id, window_start);

-- Step 6: Add comments for documentation
COMMENT ON COLUMN nfc_bands.security_token IS 'JWT token for secure NFC band authentication';
COMMENT ON COLUMN nfc_bands.token_issued_at IS 'Timestamp when security token was issued';
COMMENT ON COLUMN nfc_bands.token_expires_at IS 'Timestamp when security token expires';
COMMENT ON COLUMN nfc_bands.binding_verified_at IS 'Timestamp when binding was verified';
COMMENT ON COLUMN nfc_bands.last_location IS 'Last known location (POINT) for cloning detection';
COMMENT ON COLUMN nfc_bands.concurrent_use_count IS 'Current number of concurrent uses';
COMMENT ON COLUMN nfc_bands.max_concurrent_uses IS 'Maximum allowed concurrent uses (default: 1)';
COMMENT ON TABLE nfc_nonces IS 'Tracks nonces used in NFC transactions to prevent replay attacks';
COMMENT ON TABLE nfc_usage_sessions IS 'Tracks active usage sessions for cloning detection';
COMMENT ON TABLE nfc_rate_limits IS 'Tracks rate limits per NFC band to prevent abuse';

-- Step 7: Enable RLS on new tables
ALTER TABLE nfc_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_usage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_rate_limits ENABLE ROW LEVEL SECURITY;
