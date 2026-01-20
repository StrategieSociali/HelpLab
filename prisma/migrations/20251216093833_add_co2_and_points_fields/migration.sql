/*
  Warnings:

  - A unique constraint covering the columns `[nickname]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `challenge_submissions` ADD COLUMN `task_id` BIGINT UNSIGNED NULL;

-- AlterTable
ALTER TABLE `challenge_tasks` ADD COLUMN `co2_quota` DOUBLE NULL,
    ADD COLUMN `max_points` INTEGER NULL;

-- AlterTable
ALTER TABLE `challenges` ADD COLUMN `approved_co2` DOUBLE NULL,
    ADD COLUMN `max_points` INTEGER NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `nickname` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `idx_csub_task` ON `challenge_submissions`(`task_id`);

-- CreateIndex
CREATE UNIQUE INDEX `users_nickname_key` ON `users`(`nickname`);

-- AddForeignKey
ALTER TABLE `challenge_submissions` ADD CONSTRAINT `challenge_submissions_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `challenge_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
