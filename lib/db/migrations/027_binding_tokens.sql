-- Binding Tokens Migration
-- Creates table for temporary NFC binding tokens
-- Run this migration using: psql $DIRECT_URL -f lib/db/migrations/027_binding_tokens.sql

-- Create binding_tokens table
CREATE TABLE IF NOT EXISTS binding_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_binding_tokens_token ON binding_tokens(token);
CREATE INDEX IF NOT EXISTS idx_binding_tokens_user_id ON binding_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_binding_tokens_expires_at ON binding_tokens(expires_at);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_binding_tokens_used_expired ON binding_tokens(used_at, expires_at);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_binding_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM binding_tokens
  WHERE expires_at < NOW() OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON TABLE binding_tokens IS 'Temporary tokens for NFC band binding (5 minute expiration, one-time use)';
