-- Binding Tokens RLS Policies
-- Run this migration using: psql $DIRECT_URL -f lib/db/migrations/028_binding_tokens_rls.sql

-- Enable RLS on binding_tokens table
ALTER TABLE binding_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only view their own binding tokens
CREATE POLICY "Users can view their own binding tokens"
  ON binding_tokens FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own binding tokens (via API)
CREATE POLICY "Users can create their own binding tokens"
  ON binding_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users cannot update binding tokens (only server can mark as used)
-- No UPDATE policy - server uses service role

-- Users cannot delete binding tokens
-- No DELETE policy - cleanup via scheduled job

-- Super admins can view all binding tokens
CREATE POLICY "Super admins can view all binding tokens"
  ON binding_tokens FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Add comment
COMMENT ON POLICY "Users can view their own binding tokens" ON binding_tokens IS 
  'Users can only see their own binding tokens for security';
