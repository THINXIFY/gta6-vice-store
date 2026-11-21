ALTER TABLE "admin_users" ADD COLUMN "totp_secret" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "totp_pending" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "totp_last_step" bigint;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rate_source" text;--> statement-breakpoint
ALTER TABLE "payment_screenshots" ADD COLUMN "purged_at" timestamp with time zone;--> statement-breakpoint
-- Screenshots stay immutable evidence; the only permitted change is a retention purge,
-- which empties the image bytes once and records when (size and hash are kept).
CREATE OR REPLACE FUNCTION payment_screenshots_purge_only() RETURNS trigger AS $$
BEGIN
  IF OLD.purged_at IS NULL AND NEW.purged_at IS NOT NULL AND octet_length(NEW.data) = 0
     AND NEW.id = OLD.id AND NEW.order_id = OLD.order_id AND NEW.mime = OLD.mime
     AND NEW.bytes = OLD.bytes AND NEW.sha256 = OLD.sha256 AND NEW.created_at = OLD.created_at THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION '%: append-only table (retention purge is the only allowed change)', TG_TABLE_NAME USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS payment_screenshots_no_update ON payment_screenshots;
--> statement-breakpoint
CREATE TRIGGER payment_screenshots_purge_only BEFORE UPDATE ON payment_screenshots FOR EACH ROW EXECUTE FUNCTION payment_screenshots_purge_only();
--> statement-breakpoint
CREATE TRIGGER payment_screenshots_no_delete BEFORE DELETE ON payment_screenshots FOR EACH ROW EXECUTE FUNCTION append_only();
