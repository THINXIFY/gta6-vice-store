-- Immutable order identity, pricing and quote: once created, never rewritten.
CREATE OR REPLACE FUNCTION orders_guard_immutable() RETURNS trigger AS $$
BEGIN
  IF NEW.payment_id IS DISTINCT FROM OLD.payment_id
    OR NEW.reference IS DISTINCT FROM OLD.reference
    OR NEW.access_key_hash IS DISTINCT FROM OLD.access_key_hash
    OR NEW.edition_id IS DISTINCT FROM OLD.edition_id
    OR NEW.platform_id IS DISTINCT FROM OLD.platform_id
    OR NEW.usd_cents IS DISTINCT FROM OLD.usd_cents
    OR NEW.asset IS DISTINCT FROM OLD.asset
    OR NEW.network IS DISTINCT FROM OLD.network
    OR NEW.crypto_amount IS DISTINCT FROM OLD.crypto_amount
    OR NEW.address IS DISTINCT FROM OLD.address
    OR NEW.is_test IS DISTINCT FROM OLD.is_test
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'orders: immutable column changed' USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER orders_guard_immutable BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION orders_guard_immutable();
--> statement-breakpoint
-- Append-only history and audit trail.
CREATE OR REPLACE FUNCTION append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '%: append-only table', TG_TABLE_NAME USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER order_status_history_append_only BEFORE UPDATE OR DELETE ON order_status_history FOR EACH ROW EXECUTE FUNCTION append_only();
--> statement-breakpoint
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION append_only();
--> statement-breakpoint
CREATE TRIGGER payment_submissions_append_only BEFORE UPDATE OR DELETE ON payment_submissions FOR EACH ROW EXECUTE FUNCTION append_only();
--> statement-breakpoint
-- Orders are never deleted (history must stay intact).
CREATE TRIGGER orders_no_delete BEFORE DELETE ON orders FOR EACH ROW EXECUTE FUNCTION append_only();
