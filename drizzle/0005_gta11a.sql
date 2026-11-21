CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"topic" text NOT NULL,
	"payment_id" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"is_test" boolean NOT NULL,
	"ip_hash" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_messages_status" CHECK ("support_messages"."status" in ('open', 'resolved')),
	CONSTRAINT "support_messages_topic" CHECK ("support_messages"."topic" in ('order', 'payment', 'delivery', 'refund', 'other')),
	CONSTRAINT "support_messages_lengths" CHECK (length("support_messages"."message") between 10 and 4000 and length("support_messages"."email") <= 254 and ("support_messages"."name" is null or length("support_messages"."name") <= 120)),
	CONSTRAINT "support_messages_payment_id" CHECK ("support_messages"."payment_id" is null or "support_messages"."payment_id" ~ '^VICE-[0-9A-HJKMNP-TV-Z]{8}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "support_messages_reference_key" ON "support_messages" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "support_messages_status_idx" ON "support_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE TRIGGER support_messages_no_delete BEFORE DELETE ON support_messages FOR EACH ROW EXECUTE FUNCTION append_only();
