import type { z } from 'zod';
import type { studentFormSchema, subjectSchema } from '@/components/app/student-form-schema';

export type SubjectFormData = z.infer<typeof subjectSchema>;
export type StudentFormData = z.infer<typeof studentFormSchema>;

export interface MarksheetSubject extends SubjectFormData {
  percentage: number;
  feedback?: string;
}

export interface MarksheetData extends Omit<StudentFormData, 'subjects'> {
  subjects: MarksheetSubject[];
  totalMarksObtained: number;
  totalMaxMarks: number;
  overallPercentage: number;
}
