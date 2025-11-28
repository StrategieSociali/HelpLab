-- CreateTable
CREATE TABLE `challenge_tasks` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `challenge_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `order_index` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_task_challenge`(`challenge_id`),
    UNIQUE INDEX `uq_task_challenge_order`(`challenge_id`, `order_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `challenge_tasks` ADD CONSTRAINT `fk_task_challenge` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
