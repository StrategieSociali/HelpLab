-- CreateTable
CREATE TABLE `revoked_tokens` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `token_hash` CHAR(64) NOT NULL,
    `revoked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `revoked_tokens_token_hash_key`(`token_hash`),
    INDEX `idx_rt_expires`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
