/*
  Warnings:

  - You are about to drop the column `registration_no` on the `student_details` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `student_details_registration_no_key` ON `student_details`;

-- AlterTable
ALTER TABLE `student_details` DROP COLUMN `registration_no`,
    ADD COLUMN `registrationNo` VARCHAR(191) NULL,
    MODIFY `roll_no` VARCHAR(191) NULL,
    MODIFY `name` VARCHAR(191) NULL,
    MODIFY `father_name` VARCHAR(191) NULL,
    MODIFY `mother_name` VARCHAR(191) NULL,
    MODIFY `dob` DATE NULL,
    MODIFY `gender` VARCHAR(191) NULL,
    MODIFY `faculty` VARCHAR(191) NULL,
    MODIFY `class` VARCHAR(191) NULL,
    MODIFY `academic_year` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `student_marks_details` MODIFY `subject_name` VARCHAR(191) NULL,
    MODIFY `category` VARCHAR(191) NULL,
    MODIFY `max_marks` INTEGER NULL,
    MODIFY `pass_marks` INTEGER NULL,
    MODIFY `theory_marks_obtained` INTEGER NULL,
    MODIFY `practical_marks_obtained` INTEGER NULL,
    MODIFY `obtained_total_marks` INTEGER NULL;
