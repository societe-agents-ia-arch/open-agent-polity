CREATE TABLE `rate_limit_buckets` (
	`scope` text NOT NULL,
	`key_hash` text NOT NULL,
	`window_seconds` integer NOT NULL,
	`bucket_start` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rate_limit_bucket` ON `rate_limit_buckets` (`scope`,`key_hash`,`window_seconds`,`bucket_start`);
--> statement-breakpoint
CREATE INDEX `idx_rate_limit_updated` ON `rate_limit_buckets` (`updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_invitations_redemption` ON `invitations` (`redeemed_at`,`expires_at`);
--> statement-breakpoint
PRAGMA optimize;
