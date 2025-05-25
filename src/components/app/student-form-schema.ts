import { z } from 'zod';

// Re-using ACADEMIC_YEAR_OPTIONS from marksheet-form-schema for consistency
// If this file is entirely separate, you might define its own specific options
// or import them from a shared constants/types file if they are truly identical.
export const ACADEMIC_YEAR_OPTIONS = ["11th", "12th", "1st Year", "2nd Year", "3rd Year"] as const;

export const subjectSchema = z.object({
  id: z.string().optional(), // For useFieldArray key (allows React Hook Form to uniquely identify dynamic fields)
  subjectName: z.string().min(1, 'Subject name is required').max(50, 'Subject name too long'),
  marksObtained: z.coerce.number().min(0, 'Marks obtained cannot be negative'), // `coerce` handles string to number conversion
  maxMarks: z.coerce.number().min(1, 'Maximum marks must be at least 1'), // `coerce` handles string to number conversion
}).refine(data => data.marksObtained <= data.maxMarks, {
  message: 'Marks obtained cannot exceed maximum marks',
  path: ['marksObtained'], // Attaches error to `marksObtained` field
});

export const studentFormSchema = z.object({
  studentName: z.string().min(1, 'Student name is required').max(100, 'Student name too long'),
  // Changed from studentId to rollNumber for consistency with marksheet schema
  rollNumber: z.string().min(1, 'Roll number is required').max(50, 'Roll number too long'),
  // Using z.enum for studentClass for type safety and predefined options
  studentClass: z.enum(ACADEMIC_YEAR_OPTIONS, {
    required_error: 'Class is required.',
  }),
  subjects: z.array(subjectSchema)
    .min(1, 'At least one subject is required.')
    .refine(
      (subjects) => {
        if (subjects.length <= 1) return true; // No duplicates if 0 or 1 subject
        const filledSubjectNames = subjects
          .map((s) => (s.subjectName || '').trim().toLowerCase())
          .filter(name => name !== ''); // Only consider non-empty names for uniqueness check

        if (filledSubjectNames.length <= 1) return true; // No duplicates if 0 or 1 filled name
        const uniqueSubjectNames = new Set(filledSubjectNames);
        return uniqueSubjectNames.size === filledSubjectNames.length; // Check if all filled names are unique
      },
      {
        message: 'Duplicate subject names are not allowed. Each subject name must be unique.',
        path: ['subjects'], // General error path for the array
      }
    ),
});