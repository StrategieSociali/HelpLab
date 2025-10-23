-- CreateTable
CREATE TABLE `challenge_participants` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `challenge_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `joined_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_cp_us`(`user_id`),
    UNIQUE INDEX `uq_cp`(`challenge_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `challenge_scores` (
    `challenge_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `verified_tasks_count` INTEGER NOT NULL DEFAULT 0,
    `last_event_at` DATETIME(0) NULL,

    INDEX `fk_cs_us`(`user_id`),
    INDEX `idx_cs_challenge_score`(`challenge_id`, `score`),
    INDEX `idx_cs_challenge_last_event`(`challenge_id`, `last_event_at`),
    INDEX `idx_cs_user`(`user_id`),
    PRIMARY KEY (`challenge_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `challenge_submissions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `challenge_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `reviewer_user_id` BIGINT UNSIGNED NULL,
    `payload_json` JSON NULL,
    `activity_description` VARCHAR(500) NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `visibility` ENUM('private', 'participants', 'public') NOT NULL DEFAULT 'participants',
    `points_awarded` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reviewed_at` DATETIME(0) NULL,

    INDEX `fk_csub_us`(`user_id`),
    INDEX `idx_challenge_created`(`challenge_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `challenges` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `proposal_uuid` CHAR(36) NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `type` VARCHAR(80) NOT NULL DEFAULT 'generic',
    `location` VARCHAR(255) NULL,
    `rules` TEXT NULL,
    `deadline` DATE NULL,
    `status` ENUM('open', 'in_review', 'closed') NOT NULL DEFAULT 'open',
    `budget_amount` DECIMAL(10, 2) NULL,
    `budget_currency` CHAR(3) NULL,
    `sponsor_id` BIGINT UNSIGNED NULL,
    `judge_user_id` BIGINT UNSIGNED NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `target_json` JSON NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `proposal_id` CHAR(36) NULL,

    UNIQUE INDEX `slug`(`slug`),
    UNIQUE INDEX `proposal_id`(`proposal_id`),
    INDEX `fk_ch_judge`(`judge_user_id`),
    INDEX `fk_ch_sponsor`(`sponsor_id`),
    INDEX `idx_deadline`(`deadline`),
    INDEX `idx_status`(`status`),
    INDEX `idx_created_by`(`created_by`),
    INDEX `idx_ch_proposal_uuid`(`proposal_uuid`),
    INDEX `idx_ch_updated`(`updated_at`),
    INDEX `idx_challenges_proposal_id`(`proposal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

    UNIQUE INDEX `slug`(`slug`),
    INDEX `idx_level`(`level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sponsors` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(180) NOT NULL,
    `website` VARCHAR(255) NULL,

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
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(80) NOT NULL,
    `email` VARCHAR(191) NULL,
    `password_hash` VARCHAR(255) NULL,
    `role` ENUM('user', 'judge', 'admin') NULL DEFAULT 'user',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `username`(`username`),
    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `form_submissions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `interests_json` JSON NULL,
    `newsletter` BOOLEAN NOT NULL DEFAULT false,
    `ip` VARCHAR(45) NULL,
    `ua` VARCHAR(255) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `challenge_proposals` (
    `id` CHAR(36) NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `impact_type` VARCHAR(80) NULL,
    `start_date` DATE NULL,
    `deadline` DATE NULL,
    `location_address` VARCHAR(255) NULL,
    `location_geo` JSON NULL,
    `target` JSON NULL,
    `tasks` JSON NULL,
    `visibility_options` JSON NULL,
    `co2e_estimate_kg` DECIMAL(12, 3) NULL,
    `difficulty` ENUM('low', 'medium', 'high') NULL,
    `complexity_notes` VARCHAR(255) NULL,
    `sponsor_interest` BOOLEAN NOT NULL DEFAULT false,
    `sponsor_pitch` VARCHAR(255) NULL,
    `sponsor_budget_requested` INTEGER NULL,
    `terms_consent` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('pending_review', 'approved', 'rejected') NOT NULL DEFAULT 'pending_review',
    `challenge_id` BIGINT UNSIGNED NULL,
    `approved_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_cp_user`(`user_id`),
    INDEX `idx_cp_status`(`status`),
    INDEX `idx_cp_challenge_id`(`challenge_id`),
    INDEX `idx_cp_status_created`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review_audit` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `submission_id` BIGINT UNSIGNED NOT NULL,
    `reviewer_user_id` BIGINT UNSIGNED NOT NULL,
    `action` ENUM('approve', 'reject') NOT NULL,
    `points_awarded` INTEGER NULL,
    `note` VARCHAR(255) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `reviewer_user_id`(`reviewer_user_id`),
    INDEX `submission_id`(`submission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `points_transactions` (
    `id` VARCHAR(50) NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `challenge_id` BIGINT UNSIGNED NOT NULL,
    `submission_id` BIGINT UNSIGNED NOT NULL,
    `event` VARCHAR(80) NOT NULL,
    `delta` INTEGER NOT NULL,
    `meta_json` JSON NULL,
    `version` VARCHAR(10) NOT NULL DEFAULT '1.0',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `auto_base_points` INTEGER NULL DEFAULT 0,
    `judge_points` INTEGER NULL DEFAULT 0,
    `final_points` INTEGER NULL DEFAULT 0,
    `consistency_bonus_pct` DOUBLE NULL DEFAULT 0,
    `repetition_penalty_pct` DOUBLE NULL DEFAULT 0,
    `improvement_bonus_pct` DOUBLE NULL DEFAULT 0,
    `scoring_config_version` VARCHAR(191) NULL DEFAULT '1.0',

    INDEX `idx_pt_challenge_created`(`challenge_id`, `created_at`),
    INDEX `idx_pt_user_challenge`(`user_id`, `challenge_id`),
    INDEX `idx_pt_event`(`event`),
    UNIQUE INDEX `uq_pt_submission_event`(`submission_id`, `event`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `challenge_participants` ADD CONSTRAINT `fk_cp_ch` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `challenge_participants` ADD CONSTRAINT `fk_cp_us` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `challenge_scores` ADD CONSTRAINT `fk_cs_ch` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `challenge_scores` ADD CONSTRAINT `fk_cs_us` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `challenge_submissions` ADD CONSTRAINT `fk_csub_ch` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `challenge_submissions` ADD CONSTRAINT `fk_csub_us` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `challenges` ADD CONSTRAINT `fk_ch_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `challenges` ADD CONSTRAINT `fk_ch_judge` FOREIGN KEY (`judge_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `challenges` ADD CONSTRAINT `fk_ch_sponsor` FOREIGN KEY (`sponsor_id`) REFERENCES `sponsors`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `challenges` ADD CONSTRAINT `fk_chal_proposal` FOREIGN KEY (`proposal_id`) REFERENCES `challenge_proposals`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `learning_modules` ADD CONSTRAINT `fk_lm_path` FOREIGN KEY (`path_id`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_module_progress` ADD CONSTRAINT `fk_ump_mod` FOREIGN KEY (`module_id`) REFERENCES `learning_modules`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_module_progress` ADD CONSTRAINT `fk_ump_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `challenge_proposals` ADD CONSTRAINT `fk_cp_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `review_audit` ADD CONSTRAINT `fk_audit_reviewer` FOREIGN KEY (`reviewer_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `review_audit` ADD CONSTRAINT `fk_audit_submission` FOREIGN KEY (`submission_id`) REFERENCES `challenge_submissions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `points_transactions` ADD CONSTRAINT `fk_pt_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `points_transactions` ADD CONSTRAINT `fk_pt_challenge` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `points_transactions` ADD CONSTRAINT `fk_pt_submission` FOREIGN KEY (`submission_id`) REFERENCES `challenge_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
