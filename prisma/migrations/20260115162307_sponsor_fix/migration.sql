/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `sponsors` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `sponsors` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `learning_paths` ADD COLUMN `external_url` VARCHAR(255) NULL,
    ADD COLUMN `playlist_embed_id` VARCHAR(100) NULL,
    ADD COLUMN `type` ENUM('manual', 'external', 'lifter') NULL DEFAULT 'manual',
    ADD COLUMN `user_can_complete` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `sponsors` ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `logo_url` VARCHAR(255) NULL,
    ADD COLUMN `public_score` INTEGER NULL DEFAULT 0,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `user_id` BIGINT UNSIGNED NOT NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('user', 'judge', 'admin', 'sponsor') NULL DEFAULT 'user';

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
CREATE TABLE `challenge_sponsorships` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `challenge_id` BIGINT UNSIGNED NOT NULL,
    `sponsor_id` BIGINT UNSIGNED NOT NULL,
    `amount_eur` INTEGER NOT NULL DEFAULT 0,
    `sponsored_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `public_comment` TEXT NULL,
    `private_notes` TEXT NULL,

    INDEX `challenge_sponsorships_sponsor_id_idx`(`sponsor_id`),
    UNIQUE INDEX `challenge_sponsorships_challenge_id_sponsor_id_key`(`challenge_id`, `sponsor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sponsor_ratings` (
    `sponsor_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `rating` INTEGER NOT NULL DEFAULT 5,
    `feedback` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`sponsor_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `sponsors_user_id_key` ON `sponsors`(`user_id`);

-- AddForeignKey
ALTER TABLE `learning_paths_progress` ADD CONSTRAINT `learning_paths_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learning_paths_progress` ADD CONSTRAINT `learning_paths_progress_path_id_fkey` FOREIGN KEY (`path_id`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sponsors` ADD CONSTRAINT `fk_sponsor_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challenge_sponsorships` ADD CONSTRAINT `fk_challenge_sponsorship_challenge` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challenge_sponsorships` ADD CONSTRAINT `fk_challenge_sponsorship_sponsor` FOREIGN KEY (`sponsor_id`) REFERENCES `sponsors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challenge_sponsorships` ADD CONSTRAINT `fk_challenge_sponsorship_user` FOREIGN KEY (`sponsor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sponsor_ratings` ADD CONSTRAINT `fk_rating_sponsor` FOREIGN KEY (`sponsor_id`) REFERENCES `sponsors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sponsor_ratings` ADD CONSTRAINT `fk_rating_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
