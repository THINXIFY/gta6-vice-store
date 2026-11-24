-- Info pages are published by default (src/config/site.ts). Clear saved publish switches so the
-- defaults apply, and drop saved page drafts that still contain unconfirmed {{markers}}.
DELETE FROM "site_content" WHERE "key" = 'pages';
--> statement-breakpoint
DELETE FROM "site_content" WHERE "key" LIKE 'page:%' AND "value"::text LIKE '%{{%';
