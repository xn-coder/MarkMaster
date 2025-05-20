
import type { z } from 'zod';
import type { marksheetFormSchema, subjectEntrySchema, ACADEMIC_YEAR_OPTIONS, SUBJECT_CATEGORIES_OPTIONS } from '@/components/app/marksheet-form-schema';

// For the form itself
export type SubjectEntryFormData = z.infer<typeof subjectEntrySchema>;
export interface MarksheetFormData extends z.infer<typeof marksheetFormSchema> {
  system_id?: string; // To hold the UUID when editing
}

// For displaying the processed marksheet
export interface MarksheetSubjectDisplayEntry extends SubjectEntryFormData {
  obtainedTotal: number; // Calculated: theoryMarksObtained + practicalMarksObtained
}

export interface MarksheetDisplayData {
  // Student Info from form
  system_id?: string; // System generated UUID
  studentName: string;
  fatherName: string;
  motherName: string;
  rollNumber: string; // This is the user-facing Roll No.
  dateOfBirth: Date; // Will be formatted for display
  gender: 'Male' | 'Female' | 'Other';
  faculty: 'ARTS' | 'COMMERCE' | 'SCIENCE';
  academicYear: typeof ACADEMIC_YEAR_OPTIONS[number];
  section: string;
  sessionStartYear: number;
  sessionEndYear: number;
  overallPassingThresholdPercentage: number;

  subjects: MarksheetSubjectDisplayEntry[];

  // Auto-filled or derived for display
  collegeCode: string;
  marksheetNo: string;
  sessionDisplay: string; // e.g., "2018-2019"
  classDisplay: string; // e.g., "11th (A)" (derived from academicYear and section)

  aggregateMarksCompulsoryElective: number;
  totalPossibleMarksCompulsoryElective: number;

  overallResult: 'Pass' | 'Fail';
  overallPercentageDisplay: number; // (aggregate / totalPossible) * 100

  dateOfIssue: string; // Formatted current date
  place: string; // Constant: "Samastipur"
}

// For subject templates
export interface SubjectTemplateItem {
  subjectName: string;
  category: typeof SUBJECT_CATEGORIES_OPTIONS[number];
  totalMarks: number;
  passMarks: number;
}

// For Import Page Feedback
export interface StudentImportFeedbackItem {
  rowNumber: number;
  excelStudentId?: string; // ID/Roll No from Excel
  name: string;
  generatedSystemId?: string; // New UUID if added
  status: 'added' | 'skipped' | 'error';
  message: string;
  details?: string;
}

export interface MarksImportFeedbackItem {
  rowNumber: number;
  excelStudentId?: string; // ID/Roll No from Excel (used for linking)
  studentName: string; // As it appeared in Excel
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

// For Dashboard student list
export interface StudentRowData {
  system_id: string; // System generated UUID (PK in student_details)
  roll_no: string;   // User-facing roll number
  name: string;
  academicYear: string; // Session like "2025-2027"
  studentClass: string; // Class like "11th", "1st Year" (maps to 'class' column in DB)
  faculty: string;
}
