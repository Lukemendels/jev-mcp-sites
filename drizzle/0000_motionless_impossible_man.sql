CREATE TABLE `quota` (
	`key` text PRIMARY KEY NOT NULL,
	`minute` integer NOT NULL,
	`day` integer NOT NULL,
	`minute_requests` integer NOT NULL,
	`day_requests` integer NOT NULL,
	`day_questions` integer NOT NULL
);
