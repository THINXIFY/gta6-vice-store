CREATE TABLE "edition_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"edition_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "summary" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "short_summary" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "recommended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "sort" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "short_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "sort" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "redeem_label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "redeem_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "redeem_steps" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "short_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "edition_items" ADD CONSTRAINT "edition_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "edition_items_product_sort" ON "edition_items" USING btree ("product_id","sort");