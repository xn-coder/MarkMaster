
import type { z } from 'zod';
import type { marksheetFormSchema, subjectEntrySchema } from '@/components/app/marksheet-form-schema';

// For the form itself
export type SubjectEntryFormData = z.infer<typeof subjectEntrySchema>;
export type MarksheetFormData = z.infer<typeof marksheetFormSchema>;

// For displaying the processed marksheet (matches the image more closely)
export interface MarksheetSubjectDisplayEntry extends SubjectEntryFormData {
  obtainedTotal: number; // Calculated: theoryMarksObtained + practicalMarksObtained
}

export interface MarksheetDisplayData {
  // Student Info from form
  studentName: string;
  fatherName: string;
  motherName: string;
  rollNumber: string;
  dateOfBirth: Date; // Will be formatted for display
  gender: 'Male' | 'Female' | 'Other';
  faculty: 'ARTS' | 'COMMERCE' | 'SCIENCE';
  academicYear: string; 
  studentClass: string; 
  section: string; 
  sessionStartYear: number;
  sessionEndYear: number;
  overallPassingThresholdPercentage: number; 

  subjects: MarksheetSubjectDisplayEntry[];

  // Auto-filled or derived for display
  marksheetNo: string; 
  sessionDisplay: string; // e.g., "2018-2019"
  classDisplay: string; // e.g., "12th (A)"
  
  aggregateMarksCompulsoryElective: number; 
  totalPossibleMarksCompulsoryElective: number; 
  
  overallResult: 'Pass' | 'Fail'; 
  overallPercentageDisplay: number; // (aggregate / totalPossible) * 100
  
  dateOfIssue: string; // Formatted current date
  place: string; // Constant: "Samastipur"
}

    