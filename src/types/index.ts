
import type { z } from 'zod';
import type { marksheetFormSchema, subjectEntrySchema, ACADEMIC_YEAR_OPTIONS, SUBJECT_CATEGORIES_OPTIONS } from '@/components/app/marksheet-form-schema';

// For the form itself
export type SubjectEntryFormData = z.infer<typeof subjectEntrySchema>;
export interface MarksheetFormData extends z.infer<typeof marksheetFormSchema> {
  system_id?: string; // To hold the UUID when editing
  dateOfIssue: Date; 
}

// For displaying the processed marksheet
export interface MarksheetSubjectDisplayEntry extends SubjectEntryFormData {
  obtainedTotal: number; 
}

export interface MarksheetDisplayData {
  system_id?: string; 
  studentName: string;
  fatherName: string;
  motherName: string;
  rollNumber: string; 
  dateOfBirth: Date; 
  gender: 'Male' | 'Female' | 'Other';
  faculty: 'ARTS' | 'COMMERCE' | 'SCIENCE';
  academicYear: typeof ACADEMIC_YEAR_OPTIONS[number]; // This is the "Class" like "11th"
  sessionStartYear: number;
  sessionEndYear: number;
  overallPassingThresholdPercentage: number;
  dateOfIssue: string; 

  subjects: MarksheetSubjectDisplayEntry[];

  collegeCode: string;
  marksheetNo: string;
  sessionDisplay: string; 
  classDisplay: string; // e.g., "11th" (derived from academicYear)

  aggregateMarksCompulsoryElective: number;
  totalPossibleMarksCompulsoryElective: number;

  overallResult: 'Pass' | 'Fail';
  overallPercentageDisplay: number; 

  place: string; 
}

export interface SubjectTemplateItem {
  subjectName: string;
  category: typeof SUBJECT_CATEGORIES_OPTIONS[number];
  totalMarks: number;
  passMarks: number;
}

export interface StudentImportFeedbackItem {
  rowNumber: number;
  excelStudentId?: string; 
  name: string;
  generatedSystemId?: string; 
  status: 'added' | 'skipped' | 'error';
  message: string;
  details?: string;
}

export interface MarksImportFeedbackItem {
  rowNumber: number;
  excelStudentId?: string; 
  studentName: string; 
  subjectName: string;
  status: 'added' | 'skipped' | 'error';
  message: string;
  details?: string;
}

export interface GeneralImportMessage {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export interface ImportProcessingResults {
  summaryMessages: GeneralImportMessage[];
  studentFeedback: StudentImportFeedbackItem[];
  marksFeedback: MarksImportFeedbackItem[];
  totalStudentsProcessed: number;
  totalStudentsAdded: number;
  totalStudentsSkipped: number;
  totalMarksProcessed: number;
  totalMarksAdded: number;
  totalMarksSkipped: number;
}

export interface StudentRowData {
  system_id: string; 
  roll_no: string;   
  name: string;
  academicYear: string; 
  studentClass: string; 
  faculty: string;
}
