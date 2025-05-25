-- CreateTable
CREATE TABLE `student_details` (
    `id` VARCHAR(191) NOT NULL,
    `roll_no` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `father_name` VARCHAR(191) NULL,
    `mother_name` VARCHAR(191) NULL,
    `dob` DATE NULL,
    `gender` VARCHAR(191) NULL,
    `faculty` VARCHAR(191) NULL,
    `class` VARCHAR(191) NULL,
    `academic_year` VARCHAR(191) NULL,
    `registrationNo` VARCHAR(191) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_marks_details` (
    `mark_id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_detail_id` VARCHAR(191) NOT NULL,
    `subject_name` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `max_marks` INTEGER NULL,
    `theory_pass_marks` DOUBLE NULL,
    `practical_pass_marks` DOUBLE NULL,
    `theory_marks_obtained` INTEGER NULL,
    `practical_marks_obtained` INTEGER NULL,
    `obtained_total_marks` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`mark_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_marks_details` ADD CONSTRAINT `student_marks_details_student_detail_id_fkey` FOREIGN KEY (`student_detail_id`) REFERENCES `student_details`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
