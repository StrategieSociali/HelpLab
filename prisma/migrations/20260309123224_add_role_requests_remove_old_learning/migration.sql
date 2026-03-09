-- CreateTable
CREATE TABLE `role_requests` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `requested_role` ENUM('judge', 'sponsor') NOT NULL,
    `motivation` TEXT NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `rejection_reason` TEXT NULL,
    `admin_notes` TEXT NULL,
    `reviewed_by` BIGINT UNSIGNED NULL,
    `reviewed_at` DATETIME(0) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_rr_user`(`user_id`),
    INDEX `idx_rr_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `role_requests` ADD CONSTRAINT `fk_rr_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_requests` ADD CONSTRAINT `fk_rr_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
