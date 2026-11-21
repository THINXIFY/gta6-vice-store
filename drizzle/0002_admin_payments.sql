CREATE TYPE "public"."admin_role" AS ENUM('owner', 'reviewer');--> statement-breakpoint
ALTER TYPE "public"."fulfillment_kind" ADD VALUE 'access_link';--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'reviewer' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_screenshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_screenshots_mime" CHECK ("payment_screenshots"."mime" in ('image/png', 'image/jpeg', 'image/webp')),
	CONSTRAINT "payment_screenshots_size" CHECK ("payment_screenshots"."bytes" > 0 and "payment_screenshots"."bytes" <= 5242880)
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fulfillment_inventory" ADD COLUMN "hint" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "verified_amount" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "admin_note" text;--> statement-breakpoint
ALTER TABLE "payment_submissions" ADD COLUMN "claimed_amount" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_submissions" ALTER COLUMN "claimed_amount" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payment_submissions" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "payment_submissions" ADD COLUMN "screenshot_id" uuid;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_screenshots" ADD CONSTRAINT "payment_screenshots_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_token_key" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_sessions_admin_idx" ON "admin_sessions" USING btree ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "payment_screenshots_order_idx" ON "payment_screenshots" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_screenshot_id_payment_screenshots_id_fk" FOREIGN KEY ("screenshot_id") REFERENCES "public"."payment_screenshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_verified_amount_decimal" CHECK ("orders"."verified_amount" is null or "orders"."verified_amount" ~ '^[0-9]+(\.[0-9]+)?$');--> statement-breakpoint
ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_claimed_decimal" CHECK ("payment_submissions"."claimed_amount" ~ '^[0-9]+(\.[0-9]+)?$');--> statement-breakpoint
-- Screenshots are evidence: never edited. Deletion stays possible for data-retention purges.
CREATE TRIGGER payment_screenshots_no_update BEFORE UPDATE ON payment_screenshots FOR EACH ROW EXECUTE FUNCTION append_only();
