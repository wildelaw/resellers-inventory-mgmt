-- Resell Inventory Manager — initial schema (v2)
-- 6 tables: users, items, sales, photos, mileage, app_config

CREATE TABLE `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `name` text NOT NULL,
  `role` text DEFAULT 'user' NOT NULL,
  `can_view_all` integer DEFAULT 0 NOT NULL,
  `is_active` integer DEFAULT 1 NOT NULL,
  `password_changed_at` integer DEFAULT 0 NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  `created_by` integer,
  `last_login` integer,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE INDEX `email_idx` ON `users` (`email`);
CREATE INDEX `role_idx` ON `users` (`role`);
CREATE INDEX `is_active_idx` ON `users` (`is_active`);

CREATE TABLE `items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `purchase_date` integer NOT NULL,
  `purchase_price` real NOT NULL,
  `purchase_location` text,
  `category` text,
  `status` text DEFAULT 'available' NOT NULL,
  `notes` text,
  `removal_date` integer,
  `metadata` text,
  `owner_id` integer NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX `status_idx` ON `items` (`status`);
CREATE INDEX `owner_id_idx` ON `items` (`owner_id`);
CREATE INDEX `category_idx` ON `items` (`category`);
CREATE INDEX `purchase_date_idx` ON `items` (`purchase_date`);
CREATE INDEX `owner_status_idx` ON `items` (`owner_id`, `status`);

CREATE TABLE `sales` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `item_id` integer,
  `sold_date` integer NOT NULL,
  `sold_price` real NOT NULL,
  `shipping_cost` real,
  `shipping_collected` real DEFAULT 0,
  `platform` text NOT NULL,
  `sales_tax` real,
  `platform_fees` real DEFAULT 0,
  `refund_amount` real DEFAULT 0,
  `refund_reason` text,
  `refund_type` text DEFAULT 'none' NOT NULL,
  `sold_by` integer NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`sold_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX `sold_date_idx` ON `sales` (`sold_date`);
CREATE INDEX `item_id_idx` ON `sales` (`item_id`);
CREATE INDEX `platform_idx` ON `sales` (`platform`);
CREATE INDEX `sold_by_idx` ON `sales` (`sold_by`);
CREATE INDEX `sold_by_date_idx` ON `sales` (`sold_by`, `sold_date`);

CREATE TABLE `photos` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `item_id` integer NOT NULL,
  `filename` text NOT NULL,
  `path` text NOT NULL,
  `is_primary` integer DEFAULT 0 NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `photo_item_id_idx` ON `photos` (`item_id`);

CREATE TABLE `mileage` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date` integer NOT NULL,
  `miles` real NOT NULL,
  `from_location` text,
  `to_location` text,
  `address` text,
  `vehicle` text,
  `purpose` text,
  `owner_id` integer NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX `mileage_date_idx` ON `mileage` (`date`);
CREATE INDEX `mileage_owner_idx` ON `mileage` (`owner_id`);

CREATE TABLE `app_config` (
  `id` integer PRIMARY KEY NOT NULL,
  `company_name` text DEFAULT 'Resale Manager' NOT NULL,
  `company_tagline` text DEFAULT '' NOT NULL,
  `sales_tax_rate` real DEFAULT 0.0825 NOT NULL,
  `setup_complete` integer DEFAULT 0 NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
