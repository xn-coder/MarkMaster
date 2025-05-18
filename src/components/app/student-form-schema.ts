import { z } from 'zod';

export const subjectSchema = z.object({
  id: z.string().optional(), // For useFieldArray key
  subjectName: z.string().min(1, 'Subject name is required').max(50, 'Subject name too long'),
  marksObtained: z.coerce.number().min(0, 'Marks cannot be negative'),
  maxMarks: z.coerce.number().min(1, 'Max marks must be at least 1'),
}).refine(data => data.marksObtained <= data.maxMarks, {
  message: 'Marks obtained cannot exceed maximum marks',
  path: ['marksObtained'],
});

export const studentFormSchema = z.object({
  studentName: z.string().min(1, 'Student name is required').max(100, 'Student name too long'),
  studentId: z.string().min(1, 'Student ID is required').max(50, 'Student ID too long'),
  studentClass: z.string().min(1, 'Class is required').max(30, 'Class name too long'),
  subjects: z.array(subjectSchema).min(1, 'At least one subject is required'),
});
