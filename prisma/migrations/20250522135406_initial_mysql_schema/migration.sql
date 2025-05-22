-- CreateTable
CREATE TABLE `student_details` (
    `id` VARCHAR(191) NOT NULL,
    `roll_no` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `father_name` VARCHAR(191) NOT NULL,
    `mother_name` VARCHAR(191) NOT NULL,
    `dob` DATE NOT NULL,
    `gender` VARCHAR(191) NOT NULL,
    `faculty` VARCHAR(191) NOT NULL,
    `class` VARCHAR(191) NOT NULL,
    `academic_year` VARCHAR(191) NOT NULL,
    `registration_no` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `student_details_registration_no_key`(`registration_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_marks_details` (
    `mark_id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_detail_id` VARCHAR(191) NOT NULL,
    `subject_name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `max_marks` INTEGER NOT NULL,
    `pass_marks` INTEGER NOT NULL,
    `theory_marks_obtained` INTEGER NOT NULL,
    `practical_marks_obtained` INTEGER NOT NULL,
    `obtained_total_marks` INTEGER NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`mark_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_marks_details` ADD CONSTRAINT `student_marks_details_student_detail_id_fkey` FOREIGN KEY (`student_detail_id`) REFERENCES `student_details`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
