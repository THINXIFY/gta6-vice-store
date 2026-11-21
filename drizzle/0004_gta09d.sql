CREATE TYPE "public"."email_status" AS ENUM('pending', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"kind" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"recipient" text NOT NULL,
	"delivered_to" text,
	"subject" text NOT NULL,
	"status" "email_status" DEFAULT 'pending' NOT NULL,
	"test_mode" boolean NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"provider_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "email_messages_dedupe_unique_key" CHECK (length("email_messages"."dedupe_key") between 3 and 200)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "release_key_hash" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "release_key_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_messages_dedupe_key" ON "email_messages" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "email_messages_order_idx" ON "email_messages" USING btree ("order_id","created_at");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_release_key_sha256" CHECK ("orders"."release_key_hash" is null or "orders"."release_key_hash" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
CREATE TRIGGER email_messages_no_delete BEFORE DELETE ON email_messages FOR EACH ROW EXECUTE FUNCTION append_only();
