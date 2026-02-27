/*
  Warnings:

  - You are about to drop the `learning_modules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `learning_paths` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `learning_paths_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_module_progress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `learning_modules` DROP FOREIGN KEY `fk_lm_path`;

-- DropForeignKey
ALTER TABLE `learning_paths_progress` DROP FOREIGN KEY `learning_paths_progress_path_id_fkey`;

-- DropForeignKey
ALTER TABLE `learning_paths_progress` DROP FOREIGN KEY `learning_paths_progress_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_module_progress` DROP FOREIGN KEY `fk_ump_mod`;

-- DropForeignKey
ALTER TABLE `user_module_progress` DROP FOREIGN KEY `fk_ump_user`;

-- DropTable
DROP TABLE `learning_modules`;

-- DropTable
DROP TABLE `learning_paths`;

-- DropTable
DROP TABLE `learning_paths_progress`;

-- DropTable
DROP TABLE `user_module_progress`;

-- CreateTable
CREATE TABLE `learning_path_catalog` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `category` ENUM('ONBOARDING', 'PLATFORM_USAGE', 'DATA_LITERACY', 'SUSTAINABILITY', 'GAME_THEORY', 'TECHNICAL') NOT NULL,
    `target_role` ENUM('ALL', 'VOLUNTEER', 'JUDGE', 'SPONSOR', 'PA') NOT NULL DEFAULT 'ALL',
    `type` ENUM('FREE', 'PREMIUM') NOT NULL DEFAULT 'FREE',
    `provider` ENUM('YOUTUBE', 'LIFTERLMS', 'EXTERNAL') NOT NULL,
    `external_url` VARCHAR(500) NOT NULL,
    `thumbnail_url` VARCHAR(500) NULL,
    `duration_minutes` INTEGER NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_lpc_category`(`category`),
    INDEX `idx_lpc_target_role`(`target_role`),
    INDEX `idx_lpc_type`(`type`),
    INDEX `idx_lpc_published_sort`(`is_published`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
