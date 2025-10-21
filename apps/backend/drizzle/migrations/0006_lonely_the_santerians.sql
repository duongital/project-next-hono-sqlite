CREATE TABLE `otp` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`code` text NOT NULL,
	`expires_at` integer NOT NULL,
	`is_used` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
DROP TABLE `auth_account`;--> statement-breakpoint
DROP TABLE `auth_session`;--> statement-breakpoint
DROP TABLE `auth_user`;--> statement-breakpoint
DROP TABLE `auth_verification`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`r2_key` text NOT NULL,
	`url` text NOT NULL,
	`width` integer,
	`height` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT INTO `__new_images`("id", "file_name", "file_size", "mime_type", "r2_key", "url", "width", "height", "created_at", "updated_at") SELECT "id", "file_name", "file_size", "mime_type", "r2_key", "url", "width", "height", "created_at", "updated_at" FROM `images`;--> statement-breakpoint
DROP TABLE `images`;--> statement-breakpoint
ALTER TABLE `__new_images` RENAME TO `images`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `images_r2_key_unique` ON `images` (`r2_key`);--> statement-breakpoint
CREATE TABLE `__new_todos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task` text NOT NULL,
	`is_done` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT INTO `__new_todos`("id", "task", "is_done", "created_at", "updated_at") SELECT "id", "task", "is_done", "created_at", "updated_at" FROM `todos`;--> statement-breakpoint
DROP TABLE `todos`;--> statement-breakpoint
ALTER TABLE `__new_todos` RENAME TO `todos`;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `users` ADD `provider` text DEFAULT 'email';--> statement-breakpoint
ALTER TABLE `users` ADD `provider_account_id` text;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `first_name`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `last_name`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `image_url`;