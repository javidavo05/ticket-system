-- Audit Logs Append-Only Protection
-- Prevent UPDATE and DELETE operations on audit logs
-- Run this migration using: psql $DATABASE_URL -f lib/db/migrations/006_audit_logs_append_only.sql

-- Create function to prevent audit log modification
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit logs are append-only and cannot be updated. Operation: UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit logs are append-only and cannot be deleted. Operation: DELETE';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce append-only
DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- Grant necessary permissions (if needed)
-- GRANT INSERT ON audit_logs TO authenticated;
-- REVOKE UPDATE, DELETE ON audit_logs FROM authenticated;

