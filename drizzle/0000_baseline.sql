-- Idempotent baseline adopts pre-migration installations without rebuilding tables.
CREATE TABLE IF NOT EXISTS `external_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`item_type` text NOT NULL,
	`title` text NOT NULL,
	`body_snippet` text,
	`url` text NOT NULL,
	`status` text NOT NULL,
	`project_or_room_name` text,
	`assignee_summary` text,
	`due_at` text,
	`updated_at` text NOT NULL,
	`raw_json` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `links` (
	`id` text PRIMARY KEY NOT NULL,
	`from_item_id` text NOT NULL,
	`to_item_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`origin` text NOT NULL,
	`confidence` integer,
	`suggested` integer NOT NULL,
	`created_at` text NOT NULL,
	`confirmed_at` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `planner_state` (
	`item_id` text PRIMARY KEY NOT NULL,
	`lane` text NOT NULL,
	`priority` text NOT NULL,
	`pinned` integer NOT NULL,
	`personal_note` text,
	`planned_for` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sync_audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_type` text NOT NULL,
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`source` text,
	`payload_json` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sync_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`base_url` text,
	`account_label` text,
	`scope_json` text,
	`enabled` integer NOT NULL,
	`last_sync_at` text,
	`last_error` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sync_cursors` (
	`source` text NOT NULL,
	`scope_key` text NOT NULL,
	`cursor_value` text NOT NULL,
	`updated_at` text NOT NULL
);
