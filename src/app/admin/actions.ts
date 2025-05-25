// app/admin/actions.ts

'use server';

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { format, parse, isValid, parseISO } from 'date-fns';
import type { StudentDetail, StudentMarksDetail, Prisma } from '@prisma/client';
import type { ImportProcessingResults, StudentImportFeedbackItem, MarksImportFeedbackItem, MarksheetFormData, MarksheetDisplayData, MarksheetSubjectDisplayEntry, StudentRowData } from '@/types';
import { numberToWords } from '@/lib/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// UPDATED: Fixed thresholds for fallback if subject-specific pass marks are not provided
const FIXED_THEORY_PASS_THRESHOLD = 21;
const FIXED_PRACTICAL_PASS_THRESHOLD = 9;

// async function getAuthenticatedUser() {
//     const cookieStore = cookies();
//     const supabase = createServerClient(
//         supabaseUrl,
//         supabaseAnonKey,
//         {
//             cookies: {
//                 get: (name: string) => cookieStore.get(name)?.value,
//                 set: (name: string, value: string, options: CookieOptions) => cookieStore.set({ name, value, ...options }),
//                 remove: (name: string, options: CookieOptions) => cookieStore.set({ name, value: '', ...options }),
//             },
//         }
//     );
//     const { data: { session }, error } = await supabase.auth.getSession();
//     if (error) { console.error("Supabase authentication error in server action:", error.message); throw new Error(`Authentication error: ${error.message}`); }
//     if (!session) { throw new Error('User not authenticated. Access denied.'); }
//     return session.user;
// }

const parseExcelDateServer = (excelDate: any): string | null => {
  if (typeof excelDate === 'number') {
    const date = XLSX.SSF.parse_date_code(excelDate);
    if (date) {
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      return `${date.y}-${month}-${day}`;
    }
  } else if (typeof excelDate === 'string') {
    const formatsToTry = ["yyyy-MM-dd", "dd-MM-yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy/MM/dd"];
    for (const fmt of formatsToTry) {
      try {
        const parsedDate = parse(excelDate, fmt, new Date());
        if (isValid(parsedDate)) {
          return format(parsedDate, 'yyyy-MM-dd');
        }
      } catch (e) { /* ignore */ }
    }
    if(isValid(parseISO(excelDate))){
        return format(parseISO(excelDate), 'yyyy-MM-dd');
    }
  }
  return null;
};

const ACADEMIC_YEAR_OPTIONS = ['11th', '12th', '1st Year', '2nd Year', '3rd Year'] as const;
const SUBJECT_CATEGORIES_OPTIONS = ['Compulsory', 'Elective', 'Additional'] as const;

function convertEmptyToNull(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
        return null;
    }
    return String(value).trim(); // Convert number to string for trim, then return string or null
}

interface StudentFilters {
  academicYear: string | null;
  rollNo: string | null;
  name: string | null;
  className: string | null;
  faculty: string | null;
}

export async function importDataAction(
  fileContentBase64: string,
  selectedAcademicSession: string
): Promise<ImportProcessingResults> {
  try {
    // await getAuthenticatedUser();
  } catch (authError: any) {
    return {
      summaryMessages: [{ type: 'error', message: authError.message || 'Authentication failed.' }],
      studentFeedback: [], marksFeedback: [],
      totalStudentsProcessed: 0, totalStudentsAdded: 0, totalStudentsSkipped: 0,
      totalMarksProcessed: 0, totalMarksAdded: 0, totalMarksSkipped: 0,
    };
  }

  const results: ImportProcessingResults = {
    summaryMessages: [], studentFeedback: [], marksFeedback: [],
    totalStudentsProcessed: 0, totalStudentsAdded: 0, totalStudentsSkipped: 0,
    totalMarksProcessed: 0, totalMarksAdded: 0, totalMarksSkipped: 0,
  };

  const excelStudentIdToSystemIdMap = new Map<string, string>();
  const processedSubjectKeysForImport = new Set<string>();

  try {
    const fileBuffer = Buffer.from(fileContentBase64, 'base64');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });

    const studentDetailsSheetName = 'Student Details';
    const studentDetailsSheet = workbook.Sheets[studentDetailsSheetName];
    if (!studentDetailsSheet) {
      results.summaryMessages.push({ type: 'error', message: `Sheet "${studentDetailsSheetName}" not found in the Excel file.` });
    } else {
      const studentDetailsJson = XLSX.utils.sheet_to_json<any>(studentDetailsSheet, { raw: false, defval: null });
      results.totalStudentsProcessed = studentDetailsJson.length;
      const studentDataToInsert: Prisma.StudentDetailCreateManyInput[] = [];

      for (let i = 0; i < studentDetailsJson.length; i++) {
        const row = studentDetailsJson[i];
        const rowNum = i + 2;

        const excelStudentId = String(row['Student ID'] || '').trim();
        const studentName = String(row['Student Name'] || '').trim();
        const fatherName = String(row['Father Name'] || '').trim();
        const motherName = String(row['Mother Name'] || '').trim();
        const dobRaw = row['Date of Birth'];
        const gender = String(row['Gender'] || '').trim();
        const rawRegistrationNo = String(row['Registration No'] || '').trim();
        const faculty = String(row['Faculty'] || '').trim();
        const studentClass = String(row['Class'] || '').trim();
        
        const currentFeedback: StudentImportFeedbackItem = { rowNumber: rowNum, excelStudentId, name: studentName, status: 'skipped', message: '', registrationNo: rawRegistrationNo || undefined };

        if (!excelStudentId || !studentName || !fatherName || !motherName || !dobRaw || !gender || !faculty || !studentClass) {
          currentFeedback.message = "Missing one or more required fields (Student ID, Student Name, Father Name, Mother Name, DOB, Gender, Faculty, Class).";
          results.studentFeedback.push(currentFeedback);
          results.totalStudentsSkipped++;
          continue;
        }

        const dobFormatted = parseExcelDateServer(dobRaw);
        if (!dobFormatted) {
          currentFeedback.message = `Invalid Date of Birth format: "${dobRaw}".`;
          results.studentFeedback.push(currentFeedback);
          results.totalStudentsSkipped++;
          continue;
        }

        const registrationNoForDb = convertEmptyToNull(rawRegistrationNo);

        const existingStudent = await prisma.studentDetail.findFirst({
          where: { rollNo: excelStudentId, academicYear: selectedAcademicSession, class: studentClass, faculty: faculty, registrationNo: registrationNoForDb },
          select: { id: true },
        });

        if (existingStudent) {
          currentFeedback.message = `Student with Roll No ${excelStudentId}, Reg No ${rawRegistrationNo || '(empty)'} in Session ${selectedAcademicSession}, Class ${studentClass}, Faculty ${faculty} already exists in DB. Skipped.`;
          results.studentFeedback.push(currentFeedback);
          results.totalStudentsSkipped++;
          excelStudentIdToSystemIdMap.set(excelStudentId, existingStudent.id);
          continue;
        }
        
        if (excelStudentIdToSystemIdMap.has(excelStudentId)) {
            currentFeedback.message = `Duplicate Student ID "${excelStudentId}" found within the 'Student Details' sheet. Only the first instance will be processed for database insertion. Subsequent marks will map to the first instance.`;
            results.studentFeedback.push(currentFeedback);
            results.totalStudentsSkipped++;
            continue;
        }

        const systemGeneratedId = crypto.randomUUID();
        excelStudentIdToSystemIdMap.set(excelStudentId, systemGeneratedId);
        currentFeedback.generatedSystemId = systemGeneratedId;

        studentDataToInsert.push({
          id: systemGeneratedId, rollNo: excelStudentId, name: studentName, fatherName: fatherName, motherName: motherName,
          dob: new Date(dobFormatted), gender: gender, registrationNo: registrationNoForDb, faculty: faculty,
          class: studentClass, academicYear: selectedAcademicSession,
        });
        currentFeedback.status = 'added';
        currentFeedback.message = 'Prepared for database insertion.';
        results.studentFeedback.push(currentFeedback);
      }

      if (studentDataToInsert.length > 0) {
        try {
          const creationResult = await prisma.studentDetail.createMany({
            data: studentDataToInsert,
            skipDuplicates: true,
          });
          results.totalStudentsAdded = creationResult.count;
          results.summaryMessages.push({ type: 'success', message: `${creationResult.count} new student(s) details successfully inserted.` });
          studentDataToInsert.forEach(sdi => {
            const fb = results.studentFeedback.find(f => f.generatedSystemId === sdi.id && f.status === 'added');
            if (fb) fb.message = 'Successfully added to database.';
          });

        } catch (e: any) {
          results.summaryMessages.push({ type: 'error', message: `Error inserting student details: ${e.message}` });
           studentDataToInsert.forEach(sdi => {
            const fb = results.studentFeedback.find(f => f.generatedSystemId === sdi.id && f.status === 'added');
            if (fb) { fb.status = 'error'; fb.message = `DB insert failed: ${e.message}`; }
          });
        }
      }
      results.totalStudentsSkipped = results.totalStudentsProcessed - results.totalStudentsAdded;
       if (results.totalStudentsProcessed > 0 && studentDataToInsert.length === 0 && results.totalStudentsAdded === 0) {
            if (results.studentFeedback.every(f => f.message.includes('already exists') || f.message.includes('Duplicate Student ID'))) {
                 results.summaryMessages.push({ type: 'info', message: `No new student details were inserted. All ${results.totalStudentsProcessed} rows in 'Student Details' were duplicates or already exist in the database with the same key identifiers.` });
            } else if (results.totalStudentsProcessed > 0) {
                 results.summaryMessages.push({ type: 'info', message: `No student details were inserted from 'Student Details' sheet. All ${results.totalStudentsProcessed} rows had issues or were duplicates.` });
            }
        }
    }

    // --- Process "Student Marks Details" Sheet ---
    const studentMarksSheetName = 'Student Marks Details';
    const studentMarksSheet = workbook.Sheets[studentMarksSheetName];
    if (!studentMarksSheet) {
      results.summaryMessages.push({ type: 'warning', message: `Sheet "${studentMarksSheetName}" not found. Marks were not imported.` });
    } else {
      const studentMarksJson = XLSX.utils.sheet_to_json<any>(studentMarksSheet, { raw: false, defval: null });
      results.totalMarksProcessed = studentMarksJson.length;
      const marksDataToInsert: Prisma.StudentMarksDetailCreateManyInput[] = [];

      for (let i = 0; i < studentMarksJson.length; i++) {
        const row = studentMarksJson[i];
        const rowNum = i + 2;

        const excelStudentIdForMarks = String(row['Student ID'] || '').trim();
        const studentNameForFeedback = String(row['Name'] || '').trim();
        const subjectName = String(row['Subject Name'] || '').trim();
        const subjectCategory = String(row['Subject Category'] || '').trim();
        const maxMarksRaw = row['Max Marks'];
        // NEW: Read theory and practical pass marks
        const theoryPassMarksRaw = row['Theory Pass Marks'];
        const practicalPassMarksRaw = row['Practical Pass Marks'];
        const theoryMarksObtainedRaw = row['Theory Marks Obtained'];
        const practicalMarksObtainedRaw = row['Practical Marks Obtained'];

        const currentFeedback: MarksImportFeedbackItem = { rowNumber: rowNum, excelStudentId: excelStudentIdForMarks, studentName: studentNameForFeedback, subjectName, status: 'skipped', message: '' };

        if (!excelStudentIdForMarks || !subjectName || !subjectCategory) {
          currentFeedback.message = "Missing required fields (Student ID, Subject Name, Subject Category).";
          results.marksFeedback.push(currentFeedback);
          results.totalMarksSkipped++;
          continue;
        }
        
        const systemIdForMarks = excelStudentIdToSystemIdMap.get(excelStudentIdForMarks);
        if (!systemIdForMarks) {
          currentFeedback.message = `Student ID "${excelStudentIdForMarks}" not found from 'Student Details' processing (new or existing mapping). Marks skipped.`;
          results.marksFeedback.push(currentFeedback);
          results.totalMarksSkipped++;
          continue;
        }

        const subjectKey = `${systemIdForMarks}_${subjectName.trim().toLowerCase()}`;
        if (processedSubjectKeysForImport.has(subjectKey)) {
          currentFeedback.message = `Duplicate subject "${subjectName}" for Student (System ID: ${systemIdForMarks.substring(0,8)}...) in this file. Skipped.`;
          results.marksFeedback.push(currentFeedback);
          results.totalMarksSkipped++;
          continue;
        }

        const maxMarks = parseFloat(String(maxMarksRaw));
        const theoryPassMarks = parseFloat(String(theoryPassMarksRaw));
        const practicalPassMarks = parseFloat(String(practicalPassMarksRaw));
        const theoryMarksObtained = parseFloat(String(theoryMarksObtainedRaw));
        const practicalMarksObtained = parseFloat(String(practicalMarksObtainedRaw));

        if (isNaN(maxMarks) || maxMarks < 0) {
          currentFeedback.message = "Invalid Max Marks. Must be a non-negative number.";
          results.marksFeedback.push(currentFeedback);
          results.totalMarksSkipped++;
          continue;
        }
        // NEW: Validate new pass marks
        if (!isNaN(theoryPassMarks) && (theoryPassMarks < 0 || theoryPassMarks > maxMarks)) {
            currentFeedback.message = `Invalid Theory Pass Marks (${theoryPassMarks}). Must be non-negative and not exceed Max Marks.`;
            results.marksFeedback.push(currentFeedback);
            results.totalMarksSkipped++;
            continue;
        }
        if (!isNaN(practicalPassMarks) && (practicalPassMarks < 0 || practicalPassMarks > maxMarks)) {
            currentFeedback.message = `Invalid Practical Pass Marks (${practicalPassMarks}). Must be non-negative and not exceed Max Marks.`;
            results.marksFeedback.push(currentFeedback);
            results.totalMarksSkipped++;
            continue;
        }

        processedSubjectKeysForImport.add(subjectKey);

        const obtainedTotalMarks = (isNaN(theoryMarksObtained) ? 0 : theoryMarksObtained) + (isNaN(practicalMarksObtained) ? 0 : practicalMarksObtained);

        if (obtainedTotalMarks > maxMarks) {
            currentFeedback.message = `Obtained marks (${obtainedTotalMarks}) exceed Max Marks (${maxMarks}). Skipped.`;
            results.marksFeedback.push(currentFeedback);
            results.totalMarksSkipped++;
            continue;
        }

        marksDataToInsert.push({
          studentDetailId: systemIdForMarks, subjectName: subjectName, category: subjectCategory, maxMarks: maxMarks,
          theoryPassMarks: isNaN(theoryPassMarks) ? null : theoryPassMarks,
          practicalPassMarks: isNaN(practicalPassMarks) ? null : practicalPassMarks,
          theoryMarksObtained: isNaN(theoryMarksObtained) ? null : theoryMarksObtained,
          practicalMarksObtained: isNaN(practicalMarksObtained) ? null : practicalMarksObtained,
          obtainedTotalMarks: obtainedTotalMarks,
        });
        currentFeedback.status = 'added';
        currentFeedback.message = 'Prepared for database insertion.';
        results.marksFeedback.push(currentFeedback);
      }

      if (marksDataToInsert.length > 0) {
         try {
            const creationResult = await prisma.studentMarksDetail.createMany({
                data: marksDataToInsert,
                skipDuplicates: true,
            });
            results.totalMarksAdded = creationResult.count;
            results.summaryMessages.push({ type: 'success', message: `${creationResult.count} marks records successfully inserted.` });
            marksDataToInsert.forEach(mdi => {
                const fb = results.marksFeedback.find(f => f.status === 'added' && excelStudentIdToSystemIdMap.get(f.excelStudentId) === mdi.studentDetailId && f.subjectName === mdi.subjectName);
                if (fb) fb.message = 'Successfully added to database.';
            });
         } catch (e: any) {
            results.summaryMessages.push({ type: 'error', message: `Error inserting marks details: ${e.message}` });
            marksDataToInsert.forEach(mdi => {
                const fb = results.marksFeedback.find(f => f.status === 'added' && excelStudentIdToSystemIdMap.get(f.excelStudentId) === mdi.studentDetailId && f.subjectName === mdi.subjectName);
                if (fb) { fb.status = 'error'; fb.message = `DB insert failed: ${e.message}`; }
            });
         }
      }
      results.totalMarksSkipped = results.totalMarksProcessed - results.totalMarksAdded;
      if(results.totalMarksProcessed > 0 && marksDataToInsert.length === 0 && results.totalMarksAdded === 0) {
          results.summaryMessages.push({ type: 'info', message: `No marks details were inserted. All ${results.totalMarksProcessed} rows in 'Student Marks Details' had issues or their corresponding student was not processed.` });
      }
    }

    if(results.summaryMessages.length === 0) {
        if (results.totalStudentsProcessed === 0 && results.totalMarksProcessed === 0) {
            results.summaryMessages.push({type: 'info', message: "Both 'Student Details' and 'Student Marks Details' sheets were empty or had no data."});
        } else if (results.totalStudentsAdded === 0 && results.totalMarksAdded === 0 && (results.totalStudentsSkipped > 0 || results.totalStudentsSkipped > 0)) {
             results.summaryMessages.push({type: 'info', message: "Import complete. No new data was added. All records were either skipped due to issues or already existed."});
        } else if (results.totalStudentsAdded > 0 || results.totalMarksAdded > 0) {
            results.summaryMessages.push({type: 'success', message: "Import processing complete."});
        } else {
            results.summaryMessages.push({type: 'info', message: "Import processing finished. Please review feedback."});
        }
    }

  } catch (error: any) {
    console.error("Error during Excel import processing (server action):", error);
    results.summaryMessages.push({ type: 'error', message: `Import failed at a high level: ${error.message || "An unknown error occurred."}` });
  }
  return results;
}

export async function fetchDistinctStudentFiltersAction(): Promise<{
  academicYears: string[]; classes: string[]; faculties: string[]; error?: string;
}> {
  try {
    // await getAuthenticatedUser();

    const [academicYearsResult, classesResult, facultiesResult] = await prisma.$transaction([
      prisma.studentDetail.findMany({ select: { academicYear: true }, distinct: ['academicYear'] }),
      prisma.studentDetail.findMany({ select: { class: true }, distinct: ['class'] }),
      prisma.studentDetail.findMany({ select: { faculty: true }, distinct: ['faculty'] }),
    ]);

    const academicYears = academicYearsResult.map(item => item.academicYear).filter(Boolean).sort() as string[];
    const classes = classesResult.map(item => item.class).filter(Boolean).sort() as string[];
    const faculties = facultiesResult.map(item => item.faculty).filter(Boolean).sort() as string[];

    return { academicYears, classes, faculties };

  } catch (error: any) {
    console.error("Error fetching distinct student filters:", error);
    return {
      academicYears: [], classes: [], faculties: [],
      error: error instanceof Error ? error.message : "An unknown error occurred while fetching filter options."
    };
  }
}

export async function loadStudentsForDashboardAction(
  filters: StudentFilters, limit: number, offset: number
): Promise<{ students: StudentRowData[]; totalCount: number; error?: string }> {
  try {
    // await getAuthenticatedUser();

    let whereClause: Prisma.StudentDetailWhereInput = {};

    if (filters.academicYear) { whereClause.academicYear = filters.academicYear; }
    if (filters.rollNo) { whereClause.rollNo = { contains: filters.rollNo }; }
    if (filters.name) { whereClause.name = { contains: filters.name }; }
    if (filters.className) { whereClause.class = filters.className; }
    if (filters.faculty) { whereClause.faculty = filters.faculty; }

    const totalCount = await prisma.studentDetail.count({ where: whereClause });

    const students = await prisma.studentDetail.findMany({
      where: whereClause,
      select: {
        id: true, rollNo: true, name: true, academicYear: true, class: true, faculty: true, registrationNo: true,
      },
      orderBy: [{ academicYear: 'desc' }, { name: 'asc' }],
      skip: offset, take: limit,
    });

    const mappedStudents: StudentRowData[] = students.map(s => ({
      system_id: s.id, roll_no: s.rollNo || '', registrationNo: s.registrationNo || null,
      name: s.name || '', academic_year: s.academicYear || '', class: s.class || '', faculty: s.faculty || '',
    }));

    return { students: mappedStudents, totalCount: totalCount };

  } catch (error: any) {
    console.error("Error in loadStudentsForDashboardAction:", error);
    return {
      students: [], totalCount: 0,
      error: error instanceof Error ? error.message : "An unknown error occurred while fetching student data."
    };
  }
}

export async function deleteStudentAction(studentSystemIds: string[]): Promise<{ success: boolean; message: string }> {
  try {
    // await getAuthenticatedUser();
    
    if (studentSystemIds.length === 0) { return { success: false, message: 'No student IDs provided for deletion.' }; }

    for (const studentSystemId of studentSystemIds) {
        await prisma.$transaction(async (tx) => {
            await tx.studentMarksDetail.deleteMany({ where: { studentDetailId: studentSystemId }, });
            await tx.studentDetail.delete({ where: { id: studentSystemId }, });
        });
    }
    
    const message = studentSystemIds.length > 1 
        ? `${studentSystemIds.length} students and their marks deleted successfully.`
        : 'Student and their marks deleted successfully.';

    return { success: true, message: message };
  } catch (error) {
    console.error("Error in deleteStudentAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Deletion failed: ${errorMessage}` };
  }
}

export async function fetchStudentsForExportAction(filters: StudentFilters): Promise<(StudentDetail & { marks: StudentMarksDetail[] })[]> {
  try {
    // await getAuthenticatedUser();

    let whereClause: Prisma.StudentDetailWhereInput = {};

    if (filters.academicYear) { whereClause.academicYear = filters.academicYear; }
    if (filters.rollNo) { whereClause.rollNo = { contains: filters.rollNo }; }
    if (filters.name) { whereClause.name = { contains: filters.name }; }
    if (filters.className) { whereClause.class = filters.className; }
    if (filters.faculty) { whereClause.faculty = filters.faculty; }

    const studentsWithMarks = await prisma.studentDetail.findMany({
      where: whereClause,
      include: { marks: true },
      orderBy: [{ academicYear: 'desc' }, { name: 'asc' }],
    });
    return studentsWithMarks;
  } catch (error) {
    console.error("Error in fetchStudentsForExportAction:", error);
    if (error instanceof Error) throw new Error(error.message);
    throw new Error("An unknown error occurred while fetching data for export.");
  }
}

export async function checkExistingStudentAction(
  rollNumber: string, academicYearString: string, studentClass: string, faculty: string, registrationNo: string | null
): Promise<{ exists: boolean; studentId?: string; error?: string }> {
  try {
    // await getAuthenticatedUser();
    const existingStudent = await prisma.studentDetail.findFirst({
      where: {
        rollNo: rollNumber, academicYear: academicYearString, class: studentClass, faculty: faculty, registrationNo: registrationNo,
      }, select: { id: true },
    });
    return { exists: !!existingStudent, studentId: existingStudent?.id };
  } catch (error) {
    console.error("Error in checkExistingStudentAction:", error);
    return { exists: false, error: error instanceof Error ? error.message : "Database error checking student." };
  }
}

export interface SaveMarksheetResult {
  success: boolean; message: string; studentId?: string; errorDetails?: string;
}

export async function saveMarksheetAction(formData: MarksheetFormData): Promise<SaveMarksheetResult> {
  // try { await getAuthenticatedUser(); } catch (authError: any) { return { success: false, message: authError.message || 'Authentication failed.' }; }

  const academicSessionString = `${formData.sessionStartYear}-${formData.sessionEndYear}`;
  const systemGeneratedId = crypto.randomUUID();

  try {
    const registrationNoForDb = convertEmptyToNull(formData.registrationNo);
    const checkResult = await checkExistingStudentAction(
        formData.rollNumber, academicSessionString, formData.academicYear, formData.faculty, registrationNoForDb
    );
    if (checkResult.error) { return { success: false, message: `Failed to check for existing student: ${checkResult.error}` }; }
    if (checkResult.exists) { return { success: false, message: 'Student already exists.', errorDetails: 'A student with the same Roll No., Academic Session, Class, Faculty, and Registration No. (if provided) already exists.', }; }

    const dobFormatted = format(new Date(formData.dateOfBirth), 'yyyy-MM-dd');

    const createdStudent = await prisma.$transaction(async (tx) => {
      const student = await tx.studentDetail.create({
        data: {
          id: systemGeneratedId, rollNo: formData.rollNumber, name: formData.studentName, fatherName: formData.fatherName,
          motherName: formData.motherName, dob: new Date(dobFormatted), gender: formData.gender,
          faculty: formData.faculty, class: formData.academicYear, academicYear: academicSessionString,
          registrationNo: registrationNoForDb,
        },
      });

      if (formData.subjects && formData.subjects.length > 0) {
        const subjectMarksToInsert = formData.subjects.map(subject => ({
          studentDetailId: student.id, subjectName: subject.subjectName, category: subject.category,
          maxMarks: subject.totalMarks,
          theoryPassMarks: subject.theoryPassMarks, // NEW: Directly save the provided value
          practicalPassMarks: subject.practicalPassMarks, // NEW: Directly save the provided value
          theoryMarksObtained: subject.theoryMarksObtained || 0,
          practicalMarksObtained: subject.practicalMarksObtained || 0,
          obtainedTotalMarks: (subject.theoryMarksObtained || 0) + (subject.practicalMarksObtained || 0),
        }));

        await tx.studentMarksDetail.createMany({ data: subjectMarksToInsert });
      }
      return student;
    });

    return { success: true, message: 'Marksheet data saved successfully.', studentId: createdStudent.id };

  } catch (error) {
    console.error("Error in saveMarksheetAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while saving marksheet data.";
    return { success: false, message: 'Failed to save marksheet data.', errorDetails: errorMessage };
  }
}

export interface FetchMarksheetForEditResult {
  success: boolean; data?: MarksheetFormData; message?: string;
}

export async function fetchMarksheetForEditAction(studentSystemId: string): Promise<FetchMarksheetForEditResult> {
  try {
    // await getAuthenticatedUser();
    const studentDetails = await prisma.studentDetail.findUnique({
      where: { id: studentSystemId },
      include: { marks: true },
    });

    if (!studentDetails) { return { success: false, message: `Student data not found for ID: ${studentSystemId}.` }; }

    let sessionStartYear = new Date().getFullYear() - 1;
    let sessionEndYear = new Date().getFullYear();
    if (studentDetails.academicYear && studentDetails.academicYear.includes('-')) {
      const years = studentDetails.academicYear.split('-');
      sessionStartYear = parseInt(years[0], 10);
      sessionEndYear = parseInt(years[1], 10);
    }
    
    const transformedData: MarksheetFormData = {
      system_id: studentDetails.id, studentName: studentDetails.name ?? '', fatherName: studentDetails.fatherName ?? '',
      motherName: studentDetails.motherName ?? '', rollNumber: studentDetails.rollNo ?? '',
      registrationNo: studentDetails.registrationNo, dateOfBirth: studentDetails.dob ? new Date(studentDetails.dob) : new Date(),
      dateOfIssue: new Date(), gender: studentDetails.gender as MarksheetFormData['gender'] ?? 'Male',
      faculty: studentDetails.faculty as MarksheetFormData['faculty'] ?? 'ARTS',
      academicYear: studentDetails.class as typeof ACADEMIC_YEAR_OPTIONS[number] ?? '11th',
      sessionStartYear: sessionStartYear, sessionEndYear: sessionEndYear,
      overallPassingThresholdPercentage: 33,
      subjects: studentDetails.marks?.map(mark => ({
        id: mark.markId ? mark.markId.toString() : crypto.randomUUID(), subjectName: mark.subjectName ?? '',
        category: mark.category as MarksheetSubjectDisplayEntry['category'] ?? 'Compulsory',
        totalMarks: mark.maxMarks ?? 0,
        theoryPassMarks: mark.theoryPassMarks ?? null, // NEW: Fetch from DB
        practicalPassMarks: mark.practicalPassMarks ?? null, // NEW: Fetch from DB
        theoryMarksObtained: mark.theoryMarksObtained ?? 0,
        practicalMarksObtained: mark.practicalMarksObtained ?? 0,
      })) || [],
    };

    return { success: true, data: transformedData };

  } catch (error) {
    console.error("Error in fetchMarksheetForEditAction:", error);
    return { success: false, message: error instanceof Error ? error.message : "Database error fetching student data." };
  }
}

export interface UpdateMarksheetResult {
  success: boolean; message: string; errorDetails?: string;
}

export async function updateMarksheetAction(studentSystemId: string, formData: MarksheetFormData): Promise<UpdateMarksheetResult> {
  // try { await getAuthenticatedUser(); } catch (authError: any) { return { success: false, message: authError.message || 'Authentication failed.' }; }

  if (!studentSystemId) { return { success: false, message: "Student System ID is missing." }; }

  try {
    const dobFormatted = format(new Date(formData.dateOfBirth), 'yyyy-MM-dd');
    const registrationNoForDb = convertEmptyToNull(formData.registrationNo);

    await prisma.$transaction(async (tx) => {
      await tx.studentDetail.update({
        where: { id: studentSystemId },
        data: {
          name: formData.studentName, fatherName: formData.fatherName, motherName: formData.motherName,
          rollNo: formData.rollNumber, registrationNo: registrationNoForDb, dob: new Date(dobFormatted),
          gender: formData.gender, faculty: formData.faculty, class: formData.academicYear,
          academicYear: `${formData.sessionStartYear}-${formData.sessionEndYear}`,
        },
      });

      await tx.studentMarksDetail.deleteMany({ where: { studentDetailId: studentSystemId }, });

      if (formData.subjects && formData.subjects.length > 0) {
        const marksToInsert = formData.subjects.map(subject => ({
          studentDetailId: studentSystemId, subjectName: subject.subjectName, category: subject.category,
          maxMarks: subject.totalMarks,
          theoryPassMarks: subject.theoryPassMarks, // NEW: Directly save the provided value
          practicalPassMarks: subject.practicalPassMarks, // NEW: Directly save the provided value
          theoryMarksObtained: subject.theoryMarksObtained || 0,
          practicalMarksObtained: subject.practicalMarksObtained || 0,
          obtainedTotalMarks: (subject.theoryMarksObtained || 0) + (subject.practicalMarksObtained || 0),
        }));
        await tx.studentMarksDetail.createMany({ data: marksToInsert });
      }
    });

    return { success: true, message: "Marksheet updated successfully." };

  } catch (error) {
    console.error("Error in updateMarksheetAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while updating marksheet data.";
    return { success: false, message: "Failed to update marksheet data.", errorDetails: errorMessage };
  }
}

export interface FetchMarksheetForDisplayResult {
  success: boolean; data?: MarksheetDisplayData; message?: string;
}

const generateMarksheetNoServer = (faculty: string, rollNumber: string, sessionEndYear: number): string => {
  const facultyCode = faculty.substring(0, 2).toUpperCase();
  const month = format(new Date(), 'MMM').toUpperCase();
  const sequence = String(Math.floor(Math.random() * 900) + 100);
  return `${facultyCode}/${month}/${sessionEndYear}/${rollNumber.slice(-3) || sequence}`;
};

export async function fetchMarksheetForDisplayAction(studentSystemId: string): Promise<FetchMarksheetForDisplayResult> {
  try {
    // await getAuthenticatedUser();
    const studentDetails = await prisma.studentDetail.findUnique({
      where: { id: studentSystemId },
      include: { marks: true },
    });

    if (!studentDetails) { return { success: false, message: `Student data not found for ID: ${studentSystemId}.` }; }

    let sessionStartYear = new Date().getFullYear() - 1;
    let sessionEndYear = new Date().getFullYear();
    if (studentDetails.academicYear && studentDetails.academicYear.includes('-')) {
      const years = studentDetails.academicYear.split('-');
      sessionStartYear = parseInt(years[0], 10);
      sessionEndYear = parseInt(years[1], 10);
    }

    const formDataFromDb: MarksheetFormData = {
        system_id: studentDetails.id, studentName: studentDetails.name ?? '', fatherName: studentDetails.fatherName ?? '',
        motherName: studentDetails.motherName ?? '', registrationNo: studentDetails.registrationNo,
        rollNumber: studentDetails.rollNo ?? '', dateOfBirth: studentDetails.dob ? new Date(studentDetails.dob) : new Date(),
        dateOfIssue: new Date(), gender: studentDetails.gender as MarksheetFormData['gender'] ?? 'Male',
        faculty: studentDetails.faculty as MarksheetFormData['faculty'] ?? 'ARTS',
        academicYear: studentDetails.class as typeof ACADEMIC_YEAR_OPTIONS[number] ?? '11th',
        sessionStartYear: sessionStartYear, sessionEndYear: sessionEndYear,
        overallPassingThresholdPercentage: 33,
        subjects: studentDetails.marks?.map(mark => ({
            id: mark.markId ? mark.markId.toString() : crypto.randomUUID(), subjectName: mark.subjectName ?? '',
            category: mark.category as MarksheetSubjectDisplayEntry['category'] ?? 'Compulsory',
            totalMarks: mark.maxMarks ?? 0,
            theoryPassMarks: mark.theoryPassMarks ?? null, // NEW: Fetch from DB
            practicalPassMarks: mark.practicalPassMarks ?? null, // NEW: Fetch from DB
            theoryMarksObtained: mark.theoryMarksObtained ?? 0,
            practicalMarksObtained: mark.practicalMarksObtained ?? 0,
        })) || [],
    };

    const subjectsDisplay: MarksheetSubjectDisplayEntry[] = formDataFromDb.subjects.map(s => {
      const obtainedTotal = (s.theoryMarksObtained || 0) + (s.practicalMarksObtained || 0);
      
      let isTheoryFailed = false;
      let isPracticalFailed = false;

      // Determine theory failure: use subject's theoryPassMarks if present, otherwise fixed threshold
      const theoryPassThreshold = s.theoryPassMarks !== null && s.theoryPassMarks !== undefined 
                                  ? s.theoryPassMarks 
                                  : FIXED_THEORY_PASS_THRESHOLD;
      if (typeof s.theoryMarksObtained === 'number' && s.theoryMarksObtained < theoryPassThreshold) {
        isTheoryFailed = true;
      }

      // Determine practical failure: use subject's practicalPassMarks if present, otherwise fixed threshold
      const practicalPassThreshold = s.practicalPassMarks !== null && s.practicalPassMarks !== undefined
                                    ? s.practicalPassMarks
                                    : FIXED_PRACTICAL_PASS_THRESHOLD;
      if (typeof s.practicalMarksObtained === 'number' && s.practicalMarksObtained < practicalPassThreshold) {
        isPracticalFailed = true;
      }

      const isSubjectFailed = isTheoryFailed || isPracticalFailed; 

      return {
        ...s,
        obtainedTotal,
        isFailed: isSubjectFailed,
        isTheoryFailed,
        isPracticalFailed,
      };
    });

    const compulsoryElectiveSubjects = subjectsDisplay.filter(
      s => s.category === 'Compulsory' || s.category === 'Elective'
    );

    const aggregateMarksCompulsoryElective = compulsoryElectiveSubjects.reduce(
      (sum, s) => sum + s.obtainedTotal,
      0
    );
    const totalPossibleMarksCompulsoryElective = compulsoryElectiveSubjects.reduce(
      (sum, s) => sum + s.totalMarks,
      0
    );

    const overallPercentageDisplay = totalPossibleMarksCompulsoryElective > 0
      ? (aggregateMarksCompulsoryElective / totalPossibleMarksCompulsoryElective) * 100
      : 0;

    const totalMarksInWords = numberToWords(aggregateMarksCompulsoryElective);

    let overallResult: 'Pass' | 'Fail' = 'Pass';
    if (subjectsDisplay.some(subject => subject.isFailed && (subject.category === 'Compulsory' || subject.category === 'Elective'))) {
      overallResult = 'Fail';
    }
    if (overallPercentageDisplay < formDataFromDb.overallPassingThresholdPercentage) {
        overallResult = 'Fail';
    }

    const marksheetNo = generateMarksheetNoServer(formDataFromDb.faculty, formDataFromDb.rollNumber, formDataFromDb.sessionEndYear);

    const processedDataForDisplay: MarksheetDisplayData = {
      ...formDataFromDb,
      collegeCode: "53010",
      marksheetNo: marksheetNo,
      subjects: subjectsDisplay,
      sessionDisplay: `${formDataFromDb.sessionStartYear}-${formDataFromDb.sessionEndYear}`,
      classDisplay: `${formDataFromDb.academicYear}`,
      aggregateMarksCompulsoryElective,
      totalPossibleMarksCompulsoryElective,
      totalMarksInWords,
      overallResult,
      overallPercentageDisplay,
      dateOfIssue: format(new Date(formDataFromDb.dateOfIssue), 'MMMM yyyy'),
      place: 'Samastipur',
    };

    return { success: true, data: processedDataForDisplay };

  } catch (error) {
    console.error("Error in fetchMarksheetForDisplayAction:", error);
    return { success: false, message: error instanceof Error ? error.message : "Database error fetching marksheet data." };
  }
}