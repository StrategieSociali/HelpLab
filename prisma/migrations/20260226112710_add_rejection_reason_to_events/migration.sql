-- DropForeignKey
ALTER TABLE `events` DROP FOREIGN KEY `fk_ev_creator`;

-- DropIndex
DROP INDEX `idx_ev_start_date` ON `events`;

-- DropIndex
DROP INDEX `idx_ev_status` ON `events`;

-- AlterTable
ALTER TABLE `events` ADD COLUMN `rejection_reason` TEXT NULL;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
