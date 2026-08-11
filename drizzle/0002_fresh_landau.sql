CREATE TABLE `field_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`run_id` varchar(64) NOT NULL,
	`inep` varchar(8) NOT NULL,
	`field_id` varchar(512) NOT NULL,
	`field_path` varchar(255) NOT NULL,
	`logical_key` varchar(255) NOT NULL,
	`source` enum('PDDEINFO','SIGEF_LIBERACAO','SIGEF_EXTRATO','EXTRATO_BB','DADOS_ABERTOS') NOT NULL,
	`source_url` text NOT NULL,
	`consulted_at` timestamp NOT NULL,
	`source_hash_sha256` varchar(64),
	`raw_value` text,
	`normalized_value_json` json,
	`parser_version` varchar(32) NOT NULL,
	`extraction_rule` varchar(80) NOT NULL,
	`selector` text NOT NULL,
	`validation_results_json` json NOT NULL,
	`state` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `field_observations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `run_audit_events` (
	`id` varchar(64) NOT NULL,
	`run_id` varchar(64) NOT NULL,
	`occurred_at` timestamp NOT NULL,
	`type` enum('RUN_STARTED','SOURCE_FETCHED','FIELD_PARSED','FIELD_VALIDATED','FIELD_RECONCILED','FINDING_OPENED','HUMAN_DECISION','WORKBOOK_RELEASED') NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL,
	`inep` varchar(8),
	`field_id` varchar(512),
	`message` text NOT NULL,
	`payload_json` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `run_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `field_observations_run_idx` ON `field_observations` (`run_id`);--> statement-breakpoint
CREATE INDEX `field_observations_run_inep_idx` ON `field_observations` (`run_id`,`inep`);--> statement-breakpoint
CREATE INDEX `field_observations_field_idx` ON `field_observations` (`field_id`);--> statement-breakpoint
CREATE INDEX `field_observations_logical_idx` ON `field_observations` (`inep`,`logical_key`);--> statement-breakpoint
CREATE INDEX `run_audit_events_run_idx` ON `run_audit_events` (`run_id`);--> statement-breakpoint
CREATE INDEX `run_audit_events_run_inep_idx` ON `run_audit_events` (`run_id`,`inep`);--> statement-breakpoint
CREATE INDEX `run_audit_events_field_idx` ON `run_audit_events` (`field_id`);--> statement-breakpoint
CREATE INDEX `run_audit_events_type_idx` ON `run_audit_events` (`type`);