CREATE TABLE `members` (
	`player` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE TABLE `pool_weeks` (
	`number` integer PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_by` text
);
