/*
  Warnings:

  - You are about to drop the `learning_path_catalog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `challenge_sponsorships` DROP FOREIGN KEY `fk_challenge_sponsorship_user`;

-- AlterTable
ALTER TABLE `challenge_sponsorships` ADD COLUMN `confirmed_at` DATETIME(0) NULL,
    ADD COLUMN `payment_deadline` DATE NULL,
    ADD COLUMN `payment_status` ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE `challenges` ADD COLUMN `sponsor_interest` BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE `learning_path_catalog`;

-- CreateTable
CREATE TABLE `learning_modules` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `path_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `content_url` VARCHAR(500) NULL,
    `order_index` INTEGER NOT NULL DEFAULT 1,
    `est_minutes` INTEGER NULL,

    UNIQUE INDEX `uq_path_order`(`path_id`, `order_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learning_paths` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(160) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `level` ENUM('beginner', 'intermediate', 'advanced') NULL,
    `estimated_minutes` INTEGER NULL,
    `tags_json` JSON NULL,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `type` ENUM('manual', 'external', 'lifter') NULL DEFAULT 'manual',
    `external_url` VARCHAR(255) NULL,
    `playlist_embed_id` VARCHAR(100) NULL,
    `user_can_complete` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `slug`(`slug`),
    INDEX `idx_level`(`level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learning_paths_progress` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `path_id` BIGINT UNSIGNED NOT NULL,
    `completed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_user_path`(`user_id`, `path_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_module_progress` (
    `user_id` BIGINT UNSIGNED NOT NULL,
    `module_id` BIGINT UNSIGNED NOT NULL,
    `completed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_ump_mod`(`module_id`),
    PRIMARY KEY (`user_id`, `module_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sponsorship_requests` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `sponsor_id` BIGINT UNSIGNED NOT NULL,
    `challenge_id` BIGINT UNSIGNED NULL,
    `event_id` BIGINT UNSIGNED NULL,
    `target_type` ENUM('challenge', 'event', 'platform') NOT NULL,
    `motivation` TEXT NOT NULL,
    `report_requests` TEXT NULL,
    `budget_proposed_eur` INTEGER NULL,
    `status` ENUM('pending_review', 'approved', 'rejected', 'withdrawn') NOT NULL DEFAULT 'pending_review',
    `admin_notes` TEXT NULL,
    `reviewed_by` BIGINT UNSIGNED NULL,
    `reviewed_at` DATETIME(0) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_sr_sponsor`(`sponsor_id`),
    INDEX `idx_sr_challenge`(`challenge_id`),
    INDEX `idx_sr_event`(`event_id`),
    INDEX `idx_sr_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `learning_modules` ADD CONSTRAINT `fk_lm_path` FOREIGN KEY (`path_id`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `learning_paths_progress` ADD CONSTRAINT `learning_paths_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learning_paths_progress` ADD CONSTRAINT `learning_paths_progress_path_id_fkey` FOREIGN KEY (`path_id`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_module_progress` ADD CONSTRAINT `fk_ump_mod` FOREIGN KEY (`module_id`) REFERENCES `learning_modules`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_module_progress` ADD CONSTRAINT `fk_ump_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sponsorship_requests` ADD CONSTRAINT `fk_sr_sponsor` FOREIGN KEY (`sponsor_id`) REFERENCES `sponsors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sponsorship_requests` ADD CONSTRAINT `fk_sr_challenge` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sponsorship_requests` ADD CONSTRAINT `fk_sr_event` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sponsorship_requests` ADD CONSTRAINT `fk_sr_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
