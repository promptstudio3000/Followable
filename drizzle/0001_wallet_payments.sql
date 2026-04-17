DO $$ BEGIN
 CREATE TYPE "payment_asset" AS ENUM('eth', 'usdc');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "payment_status" AS ENUM('pending', 'confirmed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_address" text;

CREATE UNIQUE INDEX IF NOT EXISTS "users_wallet_address_idx" ON "users" USING btree ("wallet_address");

CREATE TABLE IF NOT EXISTS "payments" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "creator_id" text,
  "post_id" text,
  "wallet_address" text NOT NULL,
  "chain_id" integer NOT NULL,
  "asset" "payment_asset" NOT NULL,
  "recipient_address" text NOT NULL,
  "token_address" text,
  "amount_atomic" text NOT NULL,
  "amount_display" text NOT NULL,
  "tx_hash" text NOT NULL,
  "status" "payment_status" DEFAULT 'pending' NOT NULL,
  "target_type" "entitlement_type" NOT NULL,
  "explorer_url" text,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_tx_hash_unique_idx" ON "payments" USING btree ("tx_hash");
CREATE INDEX IF NOT EXISTS "payments_user_idx" ON "payments" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "payments_post_idx" ON "payments" USING btree ("post_id");
CREATE INDEX IF NOT EXISTS "payments_creator_idx" ON "payments" USING btree ("creator_id");
CREATE INDEX IF NOT EXISTS "payments_tx_hash_idx" ON "payments" USING btree ("tx_hash");
CREATE INDEX IF NOT EXISTS "payments_target_idx" ON "payments" USING btree ("target_type");
