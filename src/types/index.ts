// types.ts

export interface MarksheetFormData {
  system_id?: string;
  studentName: string;
  fatherName: string;
  motherName: string;
  rollNumber: string;
  registrationNo: string | null;
  dateOfBirth: Date;
  dateOfIssue: Date;
  gender: 'Male' | 'Female' | 'Other';
  faculty: 'ARTS' | 'COMMERCE' | 'SCIENCE';
  academicYear: '11th' | '12th' | '1st Year' | '2nd Year' | '3rd Year';
  overallPassingThresholdPercentage: number;
  sessionStartYear: number;
  sessionEndYear: number;
  subjects: SubjectEntryFormData[];
}

export interface SubjectTemplateItem {
  subjectName: string, 
  category: string, 
  totalMarks: number, 
  theoryPassMarks: number, 
  practicalPassMarks: number,
}

export interface SubjectEntryFormData {
  id?: string;
  subjectName: string;
  category: 'Compulsory' | 'Elective' | 'Additional';
  totalMarks: number;
  theoryPassMarks: number | null; // NEW FIELD
  practicalPassMarks: number | null; // NEW FIELD
  theoryMarksObtained: number | null;
  practicalMarksObtained: number | null;
}

export interface MarksheetSubjectDisplayEntry extends SubjectEntryFormData {
  obtainedTotal: number;
  isFailed: boolean;
  isTheoryFailed: boolean;
  isPracticalFailed: boolean;
}

export interface MarksheetDisplayData extends Omit<MarksheetFormData, 'subjects' | 'dateOfIssue' | 'dateOfBirth'> {
  marksheetNo?: string;
  collegeCode: string;
  sessionDisplay: string;
  classDisplay: string;
  subjects: MarksheetSubjectDisplayEntry[];
  aggregateMarksCompulsoryElective: number;
  totalPossibleMarksCompulsoryElective: number;
  totalMarksInWords: string;
  overallResult: 'Pass' | 'Fail';
  overallPercentageDisplay: number;
  dateOfIssue: string;
  place: string;
}

// Student Dashboard Table Row Data
export interface StudentRowData {
  system_id: string;
  roll_no: string;
  registrationNo: string | null;
  name: string;
  academic_year: string;
  class: string;
  faculty: string;
}

// Student Form for a different component (if used elsewhere)
export interface StudentFormData {
  studentName: string;
  rollNumber: string;
  studentClass: '11th' | '12th' | '1st Year' | '2nd Year' | '3rd Year';
  subjects: {
    id?: string;
    subjectName: string;
    marksObtained: number;
    maxMarks: number;
  }[];
}

// Type definitions for import processing results
export interface ImportProcessingResults {
  summaryMessages: { type: 'success' | 'error' | 'warning' | 'info'; message: string }[];
  studentFeedback: StudentImportFeedbackItem[];
  marksFeedback: MarksImportFeedbackItem[];
  totalStudentsProcessed: number;
  totalStudentsAdded: number;
  totalStudentsSkipped: number;
  totalMarksProcessed: number;
  totalMarksAdded: number;
  totalMarksSkipped: number;
}

export interface StudentImportFeedbackItem {
  rowNumber: number;
  excelStudentId: string;
  name: string;
  status: 'added' | 'skipped' | 'error';
  message: string;
  details?: string;
  generatedSystemId?: string;
  registrationNo?: string;
}

export interface MarksImportFeedbackItem {
  rowNumber: number;
  excelStudentId: string;
  studentName: string;
  subjectName: string;
  status: 'added' | 'skipped' | 'error';
  message: string;
  details?: string;
}