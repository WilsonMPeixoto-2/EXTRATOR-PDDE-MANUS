CREATE TABLE `extraction_runs` (
	`id` varchar(64) NOT NULL,
	`status` enum('running','approved','blocked','failed') NOT NULL,
	`master_count` int NOT NULL,
	`processed_count` int NOT NULL DEFAULT 0,
	`parser_version` varchar(32) NOT NULL,
	`validation_json` json NOT NULL,
	`created_by_user_id` int,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `extraction_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `run_artifacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`run_id` varchar(64) NOT NULL,
	`kind` enum('workbook','manifest','raw_html','normalized_json') NOT NULL,
	`storage_key` text NOT NULL,
	`storage_url` text NOT NULL,
	`content_type` varchar(128) NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `run_artifacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `run_findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`run_id` varchar(64) NOT NULL,
	`inep` varchar(8),
	`severity` enum('info','warning','critical') NOT NULL,
	`code` varchar(80) NOT NULL,
	`message` text NOT NULL,
	`previous_value` text,
	`current_value` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `run_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_consultations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`run_id` varchar(64) NOT NULL,
	`inep` varchar(8) NOT NULL,
	`sme` varchar(16) NOT NULL,
	`source_url` text NOT NULL,
	`consulted_at` timestamp NOT NULL,
	`status` enum('success','failed') NOT NULL,
	`attempts` int NOT NULL,
	`http_status` int,
	`parser_version` varchar(32) NOT NULL,
	`source_hash_sha256` varchar(64),
	`raw_html_key` text,
	`normalized_json_key` text,
	`programs_json` json NOT NULL,
	`unknown_destinations_json` json NOT NULL,
	`validation_issues_json` json NOT NULL,
	`exception` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `school_consultations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `extraction_runs_status_idx` ON `extraction_runs` (`status`);--> statement-breakpoint
CREATE INDEX `extraction_runs_created_idx` ON `extraction_runs` (`created_at`);--> statement-breakpoint
CREATE INDEX `run_artifacts_run_idx` ON `run_artifacts` (`run_id`);--> statement-breakpoint
CREATE INDEX `run_artifacts_kind_idx` ON `run_artifacts` (`kind`);--> statement-breakpoint
CREATE INDEX `run_findings_run_idx` ON `run_findings` (`run_id`);--> statement-breakpoint
CREATE INDEX `run_findings_severity_idx` ON `run_findings` (`severity`);--> statement-breakpoint
CREATE INDEX `school_consultations_run_idx` ON `school_consultations` (`run_id`);--> statement-breakpoint
CREATE INDEX `school_consultations_inep_idx` ON `school_consultations` (`inep`);--> statement-breakpoint
CREATE INDEX `school_consultations_run_inep_idx` ON `school_consultations` (`run_id`,`inep`);