-- CreateTable
CREATE TABLE `events` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `logo_url` VARCHAR(255) NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `location_address` VARCHAR(255) NULL,
    `location_geo` JSON NULL,
    `status` ENUM('draft', 'published', 'ended', 'rejected') NOT NULL DEFAULT 'draft',
    `created_by` BIGINT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `events_slug_key`(`slug`),
    INDEX `idx_ev_status`(`status`),
    INDEX `idx_ev_created_by`(`created_by`),
    INDEX `idx_ev_start_date`(`start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_challenges` (
    `event_id` BIGINT UNSIGNED NOT NULL,
    `challenge_id` BIGINT UNSIGNED NOT NULL,

    INDEX `idx_ec_challenge`(`challenge_id`),
    PRIMARY KEY (`event_id`, `challenge_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_consents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `consent_text` TEXT NOT NULL,
    `consented_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_econ_user`(`user_id`),
    UNIQUE INDEX `uq_event_consent`(`event_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `fk_ev_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `event_challenges` ADD CONSTRAINT `fk_ec_event` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_challenges` ADD CONSTRAINT `fk_ec_challenge` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_consents` ADD CONSTRAINT `fk_econ_event` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_consents` ADD CONSTRAINT `fk_econ_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
