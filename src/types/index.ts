import type { z } from 'zod';
import type { marksheetFormSchema, subjectEntrySchema, ACADEMIC_YEAR_OPTIONS, SUBJECT_CATEGORIES_OPTIONS } from '@/components/app/marksheet-form-schema';

// For the form itself
export type SubjectEntryFormData = z.infer<typeof subjectEntrySchema>;
export interface MarksheetFormData extends z.infer<typeof marksheetFormSchema> {
  system_id?: string; // To hold the UUID when editing
  registrationNo: string; // New field
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
  registrationNo: string; // New field
  dateOfBirth: Date;
  gender: 'Male' | 'Female' | 'Other';
  faculty: 'ARTS' | 'COMMERCE' | 'SCIENCE';
  academicYear: typeof ACADEMIC_YEAR_OPTIONS[number];
  sessionStartYear: number;
  sessionEndYear: number;
  overallPassingThresholdPercentage: number;
  dateOfIssue: string;

  subjects: MarksheetSubjectDisplayEntry[];

  collegeCode: string;
  sessionDisplay: string;
  classDisplay: string;

  aggregateMarksCompulsoryElective: number;
  totalPossibleMarksCompulsoryElective: number;
  totalMarksInWords:string;

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
  excelStudentId?: string; // This is the Roll No from Excel
  registrationNo?: string; // Registration No from Excel
  name: string;
  generatedSystemId?: string;
  status: 'added' | 'skipped' | 'error';
  message: string;
  details?: string;
}

export interface MarksImportFeedbackItem {
  rowNumber: number;
  excelStudentId?: string; // This is the Roll No from Excel used to link marks
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