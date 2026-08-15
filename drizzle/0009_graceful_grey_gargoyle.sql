CREATE TABLE `cgu_transfer_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`import_run_id` varchar(64) NOT NULL,
	`inep` varchar(8) NOT NULL,
	`cnpj` varchar(14) NOT NULL,
	`beneficiary_name` text NOT NULL,
	`reference_month` varchar(7) NOT NULL,
	`siafi_org_code` varchar(16) NOT NULL,
	`action_code` varchar(32) NOT NULL,
	`amount_cents` bigint NOT NULL,
	`source_record_fingerprint` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cgu_transfer_lines_id` PRIMARY KEY(`id`),
	CONSTRAINT `cgu_transfer_lines_import_fingerprint_uq` UNIQUE(`import_run_id`,`source_record_fingerprint`)
);
--> statement-breakpoint
CREATE TABLE `source_import_runs` (
	`id` varchar(64) NOT NULL,
	`source` enum('PDDEINFO','CGU_TRANSFERENCIAS') NOT NULL,
	`reference_period` varchar(7) NOT NULL,
	`status` enum('queued','running','completed','failed','skipped') NOT NULL,
	`idempotency_key` varchar(128) NOT NULL,
	`source_url` text,
	`source_hash_sha256` varchar(64),
	`parent_pddeinfo_run_id` varchar(64),
	`total_rows` int NOT NULL DEFAULT 0,
	`matched_uex` int NOT NULL DEFAULT 0,
	`latest_source_date` varchar(10),
	`cursor_json` json,
	`error_message` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `source_import_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_import_runs_idempotency_uq` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE INDEX `cgu_transfer_lines_inep_idx` ON `cgu_transfer_lines` (`inep`);--> statement-breakpoint
CREATE INDEX `cgu_transfer_lines_cnpj_month_idx` ON `cgu_transfer_lines` (`cnpj`,`reference_month`);--> statement-breakpoint
CREATE INDEX `source_import_runs_source_period_idx` ON `source_import_runs` (`source`,`reference_period`);--> statement-breakpoint
CREATE INDEX `source_import_runs_status_idx` ON `source_import_runs` (`status`);