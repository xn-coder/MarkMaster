
import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const subjectEntrySchema = z.object({
  id: z.string().optional(), // For useFieldArray key
  subjectName: z.string().min(1, 'Subject name is required').max(100, 'Subject name too long'),
  category: z.enum(['Compulsory', 'Elective', 'Additional'], {
    required_error: 'Subject category is required.',
  }),
  totalMarks: z.coerce.number().min(1, 'Total marks must be at least 1').max(500, 'Total marks seem too high'),
  passMarks: z.coerce.number().min(0, 'Pass marks cannot be negative').max(500, 'Pass marks seem too high'),
  theoryMarksObtained: z.coerce.number().min(0, 'Theory marks cannot be negative').optional().default(0),
  practicalMarksObtained: z.coerce.number().min(0, 'Practical marks cannot be negative').optional().default(0),
}).refine(data => (data.theoryMarksObtained || 0) + (data.practicalMarksObtained || 0) <= data.totalMarks, {
  message: 'Obtained marks (Theory + Practical) cannot exceed Total Marks',
  path: ['theoryMarksObtained'], // Or practicalMarksObtained, or a general path
}).refine(data => data.passMarks <= data.totalMarks, {
  message: 'Pass Marks cannot exceed Total Marks',
  path: ['passMarks'],
});

export const marksheetFormSchema = z.object({
  studentName: z.string().min(1, 'Student name is required').max(100, 'Student name too long'),
  fatherName: z.string().min(1, "Father's name is required").max(100, "Father's name too long"),
  motherName: z.string().min(1, "Mother's name is required").max(100, "Mother's name too long"),
  rollNumber: z.string().min(1, 'Roll number is required').max(20, 'Roll number too long'),
  dateOfBirth: z.date({ required_error: 'Date of birth is required' }),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Gender is required' }),
  faculty: z.enum(['ARTS', 'COMMERCE', 'SCIENCE'], { required_error: 'Faculty is required' }),
  academicYear: z.string().min(1, 'Academic year is required (e.g., 2023-2024)').regex(/^\d{4}-\d{4}$/, 'Academic year must be in YYYY-YYYY format'),
  studentClass: z.string().min(1, 'Class is required (e.g., 12th)').max(20, 'Class name too long'),
  section: z.string().min(1, 'Section is required (e.g., A)').max(10, 'Section too long'),
  sessionStartYear: z.coerce.number().min(currentYear - 10, `Year too old`).max(currentYear + 5, `Year too far in future`),
  sessionEndYear: z.coerce.number().min(currentYear - 10, `Year too old`).max(currentYear + 10, `Year too far in future`),
  overallPassingThresholdPercentage: z.coerce.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100'),
  subjects: z.array(subjectEntrySchema).min(1, 'At least one subject is required.'),
}).refine(data => data.sessionEndYear > data.sessionStartYear, {
  message: 'Session end year must be after start year',
  path: ['sessionEndYear'],
});

    