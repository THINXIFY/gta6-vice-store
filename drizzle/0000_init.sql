CREATE TYPE "public"."fulfillment_kind" AS ENUM('redemption_code');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('awaiting_payment', 'payment_submitted', 'under_review', 'info_required', 'payment_verified', 'game_ready', 'payment_rejected', 'order_expired');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"data" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fulfillment_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" text NOT NULL,
	"platform_id" text NOT NULL,
	"kind" "fulfillment_kind" DEFAULT 'redemption_code' NOT NULL,
	"secret_ciphertext" text NOT NULL,
	"source_reference" text NOT NULL,
	"region" text,
	"assigned_order_id" uuid,
	"assigned_at" timestamp with time zone,
	"is_test" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fulfillment_assignment_consistent" CHECK (("fulfillment_inventory"."assigned_order_id" is null) = ("fulfillment_inventory"."assigned_at" is null))
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_status_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" uuid NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"actor" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" text NOT NULL,
	"reference" text NOT NULL,
	"email" text NOT NULL,
	"region" text NOT NULL,
	"edition_id" text NOT NULL,
	"platform_id" text NOT NULL,
	"usd_cents" integer NOT NULL,
	"asset" text NOT NULL,
	"network" text NOT NULL,
	"crypto_amount" text NOT NULL,
	"rate" text NOT NULL,
	"rate_is_preview" boolean NOT NULL,
	"address" text NOT NULL,
	"quote_expires_at" timestamp with time zone NOT NULL,
	"status" "order_status" DEFAULT 'awaiting_payment' NOT NULL,
	"customer_note" text,
	"access_key_hash" text NOT NULL,
	"is_test" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_payment_id_format" CHECK ("orders"."payment_id" ~ '^VICE-[0-9A-HJKMNP-TV-Z]{8}$'),
	CONSTRAINT "orders_usd_positive" CHECK ("orders"."usd_cents" > 0),
	CONSTRAINT "orders_amount_decimal" CHECK ("orders"."crypto_amount" ~ '^[0-9]+(\.[0-9]+)?$'),
	CONSTRAINT "orders_access_key_sha256" CHECK ("orders"."access_key_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"asset" text NOT NULL,
	"network" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"validated" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_test" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_methods_asset_network_pk" PRIMARY KEY("asset","network")
);
--> statement-breakpoint
CREATE TABLE "payment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"network" text NOT NULL,
	"txid" text NOT NULL,
	"txid_normalized" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prices" (
	"edition_id" text NOT NULL,
	"platform_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prices_edition_id_platform_id_pk" PRIMARY KEY("edition_id","platform_id"),
	CONSTRAINT "prices_amount_positive" CHECK ("prices"."amount_cents" > 0),
	CONSTRAINT "prices_currency_iso" CHECK ("prices"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_inventory" ADD CONSTRAINT "fulfillment_inventory_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_inventory" ADD CONSTRAINT "fulfillment_inventory_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_inventory" ADD CONSTRAINT "fulfillment_inventory_assigned_order_id_orders_id_fk" FOREIGN KEY ("assigned_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fulfillment_inventory_assigned_order_key" ON "fulfillment_inventory" USING btree ("assigned_order_id");--> statement-breakpoint
CREATE INDEX "fulfillment_inventory_available_idx" ON "fulfillment_inventory" USING btree ("edition_id","platform_id") WHERE "fulfillment_inventory"."assigned_order_id" is null;--> statement-breakpoint
CREATE INDEX "order_status_history_order_idx" ON "order_status_history" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_payment_id_key" ON "orders" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_reference_key" ON "orders" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_email_idx" ON "orders" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "payment_submissions_network_txid_key" ON "payment_submissions" USING btree ("network","txid_normalized");--> statement-breakpoint
CREATE INDEX "payment_submissions_order_idx" ON "payment_submissions" USING btree ("order_id");