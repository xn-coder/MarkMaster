
import { z } from 'zod';

const currentYear = new Date().getFullYear();
export const ACADEMIC_YEAR_OPTIONS = ["11th", "12th", "1st Year", "2nd Year", "3rd Year"] as const;
export const SUBJECT_CATEGORIES_OPTIONS = ['Compulsory', 'Elective', 'Additional'] as const;


export const subjectEntrySchema = z.object({
  id: z.string().optional(),
  subjectName: z.string().min(1, 'Subject name is required').max(100, 'Subject name too long'),
  category: z.enum(SUBJECT_CATEGORIES_OPTIONS, {
    required_error: 'Subject category is required.',
  }),
  totalMarks: z.coerce.number().min(1, 'Total marks must be at least 1').max(500, 'Total marks seem too high'),
  passMarks: z.coerce.number().min(0, 'Pass marks cannot be negative').max(500, 'Pass marks seem too high'),
  theoryMarksObtained: z.coerce.number().min(0, 'Theory marks cannot be negative').optional().default(0),
  practicalMarksObtained: z.coerce.number().min(0, 'Practical marks cannot be negative').optional().default(0),
}).refine(data => (data.theoryMarksObtained || 0) + (data.practicalMarksObtained || 0) <= data.totalMarks, {
  message: 'Obtained marks (Theory + Practical) cannot exceed Total Marks',
  path: ['practicalMarksObtained'],
}).refine(data => data.passMarks <= data.totalMarks, {
  message: 'Pass Marks cannot exceed Total Marks',
  path: ['passMarks'],
});

export const marksheetFormSchema = z.object({
  system_id: z.string().optional(),
  studentName: z.string().min(1, 'Student name is required').max(100, 'Student name too long'),
  fatherName: z.string().min(1, "Father's name is required").max(100, "Father's name too long"),
  motherName: z.string().min(1, "Mother's name is required").max(100, "Mother's name too long"),
  rollNumber: z.string().min(1, 'Roll number is required').max(20, 'Roll number too long'),
  registrationNo: z.string().min(0, 'Registration No. is required'),
  dateOfBirth: z.date({ required_error: 'Date of birth is required' }),
  dateOfIssue: z.date({ required_error: 'Date of issue is required' }),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Gender is required' }),
  faculty: z.enum(['ARTS', 'COMMERCE', 'SCIENCE'], { required_error: 'Faculty is required' }),
  academicYear: z.enum(ACADEMIC_YEAR_OPTIONS, { required_error: 'Academic year (Class) is required' }),
  sessionStartYear: z.coerce.number().min(1950, 'Year too old').max(currentYear + 5, `Year too far in future`),
  sessionEndYear: z.coerce.number().min(1951, 'Year too old').max(currentYear + 6, `Year too far in future`),
  overallPassingThresholdPercentage: z.coerce.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100'),
  subjects: z.array(subjectEntrySchema)
    .min(1, 'At least one subject is required.')
    .refine(
      (subjects) => {
        if (subjects.length <= 1) return true;
        const filledSubjectNames = subjects
          .map((s) => (s.subjectName || '').trim().toLowerCase())
          .filter(name => name !== '');

        if (filledSubjectNames.length <= 1) return true;

        const uniqueSubjectNames = new Set(filledSubjectNames);
        return uniqueSubjectNames.size === filledSubjectNames.length;
      },
      {
        message: 'Duplicate subject names are not allowed. Each subject name must be unique.',
      }
    ),
}).refine(data => data.sessionEndYear === data.sessionStartYear + 1, {
  message: 'Session end year must be one year after the start year.',
  path: ['sessionEndYear'],
});
