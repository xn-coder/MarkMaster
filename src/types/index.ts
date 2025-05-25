'use client';

import type { z } from 'zod';
import type { marksheetFormSchema, subjectEntrySchema, ACADEMIC_YEAR_OPTIONS, SUBJECT_CATEGORIES_OPTIONS } from '@/components/app/marksheet-form-schema';

// For the form itself
export interface SubjectEntryFormData extends Omit<z.infer<typeof subjectEntrySchema>, 'passMarks'> {
  id: string; // Ensure id is always present for useFieldArray
}

export interface MarksheetFormData extends Omit<z.infer<typeof marksheetFormSchema>, 'overallPassingThresholdPercentage' | 'subjects'> {
  system_id?: string;
  registrationNo: string | null;
  dateOfIssue: Date;
  subjects: SubjectEntryFormData[];
}

// For displaying the processed marksheet
export interface MarksheetSubjectDisplayEntry extends Omit<SubjectEntryFormData, 'passMarks'> {
  obtainedTotal: number;
  isFailed?: boolean;
}

export interface MarksheetDisplayData {
  system_id?: string;
  studentName: string;
  fatherName: string;
  motherName: string;
  rollNumber: string;
  registrationNo: string | null;
  dateOfBirth: Date;
  gender: 'Male' | 'Female' | 'Other';
  faculty: 'ARTS' | 'COMMERCE' | 'SCIENCE';
  academicYear: typeof ACADEMIC_YEAR_OPTIONS[number];
  sessionStartYear: number;
  sessionEndYear: number;
  // overallPassingThresholdPercentage removed
  dateOfIssue: string;

  subjects: MarksheetSubjectDisplayEntry[];

  collegeCode: string;
  sessionDisplay: string;
  classDisplay: string;

  aggregateMarksCompulsoryElective: number;
  totalPossibleMarksCompulsoryElective: number;
  totalMarksInWords: string;

  overallResult: 'Pass' | 'Fail';
  overallPercentageDisplay: number; // Still useful for display, not for pass/fail logic

  place: string;
}

export interface SubjectTemplateItem {
  subjectName: string;
  category: typeof SUBJECT_CATEGORIES_OPTIONS[number];
  totalMarks: number;
  // passMarks removed
}

export interface StudentImportFeedbackItem {
  rowNumber: number;
  excelStudentId?: string;
  registrationNo?: string;
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
  registrationNo: string | null;
  name: string;
  academicYear: string;
  class: string;
  faculty: string;
}
