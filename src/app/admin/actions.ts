'use server';

import prisma from '@/lib/prisma'; // This connects to your MySQL database
import * as XLSX from 'xlsx';
import { format, parse, isValid, parseISO } from 'date-fns';
import type { StudentDetail, StudentMarksDetail, Prisma  } from '@prisma/client';
import type { ImportProcessingResults, StudentImportFeedbackItem, MarksImportFeedbackItem, MarksheetFormData, MarksheetDisplayData, MarksheetSubjectDisplayEntry } from '@/types'; // Added types for clarity
import { numberToWords } from '@/lib/utils';


// Helper for date parsing (can be kept in actions or a shared util)
const parseExcelDateServer = (excelDate: any): string | null => {
  if (typeof excelDate === 'number') {
    // XLSX can sometimes return a number for dates (Excel date serial number)
    const date = XLSX.SSF.parse_date_code(excelDate);
    if (date) {
      // Ensure month and day are two digits
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      return `${date.y}-${month}-${day}`; // Format as yyyy-MM-dd
    }
  } else if (typeof excelDate === 'string') {
    // Try parsing common date string formats
    const formatsToTry = ["yyyy-MM-dd", "dd-MM-yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy/MM/dd"];
    for (const fmt of formatsToTry) {
      try {
        const parsedDate = parse(excelDate, fmt, new Date());
        if (isValid(parsedDate)) {
          return format(parsedDate, 'yyyy-MM-dd');
        }
      } catch (e) { /* ignore */ }
    }
    // Try ISO format as a fallback
    if(isValid(parseISO(excelDate))){
        return format(parseISO(excelDate), 'yyyy-MM-dd');
    }
  }
  return null; // Return null if parsing fails
};

function convertEmptyToNull(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value.trim() === '') {
        return null;
    }
    return value.trim();
}


export async function importDataAction(
  fileContentBase64: string,
  selectedAcademicSession: string
): Promise<ImportProcessingResults> {

  const results: ImportProcessingResults = {
    summaryMessages: [],
    studentFeedback: [],
    marksFeedback: [],
    totalStudentsProcessed: 0,
    totalStudentsAdded: 0,
    totalStudentsSkipped: 0,
    totalMarksProcessed: 0,
    totalMarksAdded: 0,
    totalMarksSkipped: 0,
  };

  const excelStudentIdToSystemIdMap = new Map<string, string>();
  const processedSubjectKeysForImport = new Set<string>(); // To prevent duplicate subject entries for the same student from the file

  try {
    const fileBuffer = Buffer.from(fileContentBase64, 'base64');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false }); // cellDates: false to handle dates manually

    // --- Process "Student Details" Sheet ---
    const studentDetailsSheetName = 'Student Details';
    const studentDetailsSheet = workbook.Sheets[studentDetailsSheetName];
    if (!studentDetailsSheet) {
      results.summaryMessages.push({ type: 'error', message: `Sheet "${studentDetailsSheetName}" not found in the Excel file.` });
    } else {
      const studentDetailsJson = XLSX.utils.sheet_to_json<any>(studentDetailsSheet, { raw: false, defval: null });
      results.totalStudentsProcessed = studentDetailsJson.length;
      const studentDataToInsert = []; // Prepare data for Prisma createMany

      for (let i = 0; i < studentDetailsJson.length; i++) {
        const row = studentDetailsJson[i];
        const rowNum = i + 2; // Excel row number (1-based, +1 for header)

        const excelStudentId = String(row['Student ID'] || '').trim();
        const studentName = String(row['Student Name'] || '').trim();
        const fatherName = String(row['Father Name'] || '').trim();
        const motherName = String(row['Mother Name'] || '').trim();
        const dobRaw = row['Date of Birth']; // Keep raw for parsing
        const gender = String(row['Gender'] || '').trim();
        const registrationNo = String(row['Registration No'] || '').trim();
        const faculty = String(row['Faculty'] || '').trim();
        const studentClass = String(row['Class'] || '').trim();
        
        const currentFeedback: StudentImportFeedbackItem = { rowNumber: rowNum, excelStudentId, name: studentName, status: 'skipped', message: '' };

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

        const registrationNoForDb = convertEmptyToNull(registrationNo);

        const checkResult = await checkExistingStudentAction(
            excelStudentId,
            selectedAcademicSession,
            studentClass,
            faculty,
            registrationNoForDb // Pass the converted value
        );

        if (checkResult.error) {
            currentFeedback.message = `Failed to check for existing student: ${checkResult.error}`;
            results.studentFeedback.push(currentFeedback);
            results.totalStudentsSkipped++;
            continue;
        }

        if (checkResult.exists) {
            currentFeedback.message = `Student with Roll No ${excelStudentId}, Reg No ${registrationNo || '(empty)'} in Session ${selectedAcademicSession}, Class ${studentClass}, Faculty ${faculty} already exists in DB. Skipped.`;
            results.studentFeedback.push(currentFeedback);
            results.totalStudentsSkipped++;
            excelStudentIdToSystemIdMap.set(excelStudentId, checkResult.studentId!); // Map to existing DB ID
            continue;
        }

        const systemGeneratedId = crypto.randomUUID();
        excelStudentIdToSystemIdMap.set(excelStudentId, systemGeneratedId); // Map Excel ID to new system ID
        currentFeedback.generatedSystemId = systemGeneratedId;

        results.totalStudentsAdded++;

        studentDataToInsert.push({
          id: systemGeneratedId,
          rollNo: excelStudentId,
          name: studentName,
          fatherName: fatherName,
          motherName: motherName,
          dob: new Date(dobFormatted),
          gender: gender,
          registrationNo: registrationNoForDb, // Use the converted value
          faculty: faculty,
          class: studentClass,
          academicYear: selectedAcademicSession,
        });
        currentFeedback.status = 'added';
        currentFeedback.message = 'Prepared for database insertion.';
        results.studentFeedback.push(currentFeedback);
      }

      if (studentDataToInsert.length > 0) {
        try {
          const creationResult = await prisma.studentDetail.createMany({
            data: studentDataToInsert,
            skipDuplicates: true, // This might not be needed if pre-check is robust
          });
          results.totalStudentsAdded = creationResult.count;
          results.summaryMessages.push({ type: 'success', message: `${creationResult.count} new student(s) details successfully inserted.` });
          // Update feedback for successfully added students
          studentDataToInsert.forEach(sdi => {
            const fb = results.studentFeedback.find(f => f.generatedSystemId === sdi.id && f.status === 'added');
            if (fb) fb.message = 'Successfully added to database.';
          });

        } catch (e: any) {
          results.summaryMessages.push({ type: 'error', message: `Error inserting student details: ${e.message}` });
          // Mark all pending as error
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
      const marksDataToInsert = [];

      for (let i = 0; i < studentMarksJson.length; i++) {
        const row = studentMarksJson[i];
        const rowNum = i + 2;

        const excelStudentIdForMarks = String(row['Student ID'] || '').trim();
        const studentNameForFeedback = String(row['Name'] || '').trim(); // For feedback only
        const subjectName = String(row['Subject Name'] || '').trim();
        const subjectCategory = String(row['Subject Category'] || '').trim();
        const maxMarksRaw = row['Max Marks'];
        const passMarksRaw = row['Pass Marks'];
        const theoryMarksRaw = row['Theory Marks Obtained'];
        const practicalMarksRaw = row['Practical Marks Obtained'];

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

        // Prevent duplicate subject entries for the same student *within this import file*
        const subjectKey = `${systemIdForMarks}_${subjectName.trim().toLowerCase()}`;
        if (processedSubjectKeysForImport.has(subjectKey)) {
          currentFeedback.message = `Duplicate subject "${subjectName}" for Student (System ID: ${systemIdForMarks.substring(0,8)}...) in this file. Skipped.`;
          results.marksFeedback.push(currentFeedback);
          results.totalMarksSkipped++;
          continue;
        }


        const maxMarks = parseFloat(String(maxMarksRaw));
        const passMarks = parseFloat(String(passMarksRaw));
        const theoryMarks = parseFloat(String(theoryMarksRaw));
        const practicalMarks = parseFloat(String(practicalMarksRaw));

        if (isNaN(maxMarks) || isNaN(passMarks)) {
          currentFeedback.message = "Invalid Max Marks or Pass Marks. Must be numbers.";
          results.marksFeedback.push(currentFeedback);
          results.totalMarksSkipped++;
          continue;
        }
        // Add to set after validation, before pushing to insert array
        processedSubjectKeysForImport.add(subjectKey);


        const obtainedTotalMarks = (isNaN(theoryMarks) ? 0 : theoryMarks) + (isNaN(practicalMarks) ? 0 : practicalMarks);

        if (obtainedTotalMarks > maxMarks) {
            currentFeedback.message = `Obtained marks (${obtainedTotalMarks}) exceed Max Marks (${maxMarks}). Skipped.`;
            results.marksFeedback.push(currentFeedback);
            results.totalMarksSkipped++;
            continue;
        }
        if (passMarks > maxMarks) {
            currentFeedback.message = `Pass Marks (${passMarks}) exceed Max Marks (${maxMarks}). Skipped.`;
            results.marksFeedback.push(currentFeedback);
            results.totalMarksSkipped++;
            continue;
        }

        marksDataToInsert.push({
          studentDetailId: systemIdForMarks,
          subjectName: subjectName,
          category: subjectCategory,
          maxMarks: maxMarks,
          passMarks: passMarks,
          theoryMarksObtained: isNaN(theoryMarks) ? null : theoryMarks,
          practicalMarksObtained: isNaN(practicalMarks) ? null : practicalMarks,
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
                skipDuplicates: true, // Skip if a subject for a student somehow already exists (e.g. student_detail_id + subject_name unique constraint)
            });
            results.totalMarksAdded = creationResult.count;
            results.summaryMessages.push({ type: 'success', message: `${creationResult.count} marks records successfully inserted.` });
            // Update feedback
            marksDataToInsert.forEach(mdi => {
                const fb = results.marksFeedback.find(f => f.status === 'added' && excelStudentIdToSystemIdMap.get(f.excelStudentId as string) === mdi.studentDetailId && f.subjectName === mdi.subjectName);
                if (fb) fb.message = 'Successfully added to database.';
            });
         } catch (e: any) {
            results.summaryMessages.push({ type: 'error', message: `Error inserting marks details: ${e.message}` });
            marksDataToInsert.forEach(mdi => {
                const fb = results.marksFeedback.find(f => f.status === 'added' && excelStudentIdToSystemIdMap.get(f.excelStudentId as string) === mdi.studentDetailId && f.subjectName === mdi.subjectName);
                if (fb) { fb.status = 'error'; fb.message = `DB insert failed: ${e.message}`; }
            });
         }
      }
      results.totalMarksSkipped = results.totalMarksProcessed - results.totalMarksAdded;
      if(results.totalMarksProcessed > 0 && marksDataToInsert.length === 0 && results.totalMarksAdded === 0) {
          results.summaryMessages.push({ type: 'info', message: `No marks details were inserted. All ${results.totalMarksProcessed} rows in 'Student Marks Details' had issues or their corresponding student was not processed.` });
      }
    }

    if(results.summaryMessages.length === 0) { // If no major sheet errors
        if (results.totalStudentsProcessed === 0 && results.totalMarksProcessed === 0) {
            results.summaryMessages.push({type: 'info', message: "Both 'Student Details' and 'Student Marks Details' sheets were empty or had no data."});
        } else if (results.totalStudentsAdded === 0 && results.totalMarksAdded === 0 && (results.totalStudentsSkipped > 0 || results.totalMarksSkipped > 0)) {
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

export interface DashboardStudentData {
  system_id: string;
  roll_no: string | null;
  name: string | null;
  academicYear: string | null;
  studentClass: string | null;
  faculty: string | null;
}

export async function loadStudentsForDashboardAction(): Promise<DashboardStudentData[]> {
  try {
    const students = await prisma.studentDetail.findMany({
      select: {
        id: true,
        rollNo: true, // Prisma uses camelCase
        name: true,
        academicYear: true,
        class: true, // Prisma uses 'class'
        faculty: true,
      },
      orderBy: [
        { academicYear: 'desc' }, // Example sorting
        { name: 'asc' },
      ],
    });

    // Map to the structure your client component expects (StudentRowData)
    return students.map(s => ({
      system_id: s.id,
      roll_no: s.rollNo,
      name: s.name,
      academicYear: s.academicYear,
      studentClass: s.class,
      faculty: s.faculty,
    }));
  } catch (error) {
    console.error("Error in loadStudentsForDashboardAction:", error);
    if (error instanceof Error) throw new Error(error.message);
    throw new Error("An unknown error occurred while fetching student data.");
  }
}

export async function deleteStudentAction(studentSystemId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      await tx.studentMarksDetail.deleteMany({
        where: { studentDetailId: studentSystemId },
      });
      await tx.studentDetail.delete({
        where: { id: studentSystemId },
      });
    });
    return { success: true, message: 'Student and their marks deleted successfully.' };
  } catch (error) {
    console.error("Error in deleteStudentAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Deletion failed: ${errorMessage}` };
  }
}

export interface StudentDataForExport extends StudentDetail {
  marks: StudentMarksDetail[];
}

export async function fetchStudentsForExportAction(studentSystemIds: string[]): Promise<StudentDataForExport[]> {
  try {
    const studentsWithMarks = await prisma.studentDetail.findMany({
      where: {
        id: {
          in: studentSystemIds,
        },
      },
      include: {
        marks: true, // Eager load marks
      },
    });
    return studentsWithMarks; // Prisma types are already well-structured
  } catch (error) {
    console.error("Error in fetchStudentsForExportAction:", error);
    if (error instanceof Error) throw new Error(error.message);
    throw new Error("An unknown error occurred while fetching data for export.");
  }
}

export async function checkExistingStudentAction(
  rollNumber: string,
  academicYearString: string,
  studentClass: string, // Changed from academicYear to studentClass to match form data
  faculty: string,
  registrationNo: string | null
): Promise<{ exists: boolean; studentId?: string; error?: string }> {
  try {

    const whereClause: Prisma.StudentDetailWhereInput = {
      rollNo: rollNumber,
      academicYear: academicYearString,
      class: studentClass,
      faculty: faculty,
    };

    if (registrationNo !== null) { // If a non-null value was passed
      whereClause.registrationNo = registrationNo;
    } else { // If null was passed (meaning it was empty from input)
      whereClause.registrationNo = null; // Specifically check for DB records where registrationNo is NULL
    }

    const existingStudent = await prisma.studentDetail.findFirst({
      where: whereClause,
      select: { id: true },
    });

    return { exists: !!existingStudent, studentId: existingStudent?.id };
  } catch (error) {
    console.error("Error in checkExistingStudentAction:", error);
    return { exists: false, error: error instanceof Error ? error.message : "Database error checking student." };
  }
}


export interface SaveMarksheetResult {
  success: boolean;
  message: string;
  studentId?: string; // Return the ID of the newly created student
  errorDetails?: string;
}

export async function saveMarksheetAction(formData: MarksheetFormData): Promise<SaveMarksheetResult> {
  try {
  } catch (authError: any) {
    return { success: false, message: authError.message || 'Authentication failed.' };
  }

  const academicSessionString = `${formData.sessionStartYear}-${formData.sessionEndYear}`;
  const systemGeneratedId = crypto.randomUUID(); // Generate ID on the server

  try {
    // Check for existing student again on the server as a safeguard
    const existingStudent = await prisma.studentDetail.findFirst({
      where: {
        rollNo: formData.rollNumber,
        academicYear: academicSessionString,
        class: formData.academicYear, // Matches form data
        faculty: formData.faculty,
      },
    });

    if (existingStudent) {
      return {
        success: false,
        message: 'Student already exists (checked on server).',
        errorDetails: 'A student with the same Roll No., Academic Session, Class, and Faculty already exists.',
      };
    }

    const dobFormatted = format(new Date(formData.dateOfBirth), 'yyyy-MM-dd'); // Ensure dateOfBirth is a Date object or valid string

    // Use a transaction to insert student and marks together
    const createdStudent = await prisma.$transaction(async (tx) => {
      const student = await tx.studentDetail.create({
        data: {
          id: systemGeneratedId,
          rollNo: formData.rollNumber,
          name: formData.studentName,
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          dob: new Date(dobFormatted), 
          gender: formData.gender,
          faculty: formData.faculty,
          class: formData.academicYear, 
          academicYear: academicSessionString,
          registrationNo: formData.registrationNo,
          // createdAt and updatedAt will be handled by Prisma if @default(now()) and @updatedAt are set
        },
      });

      if (formData.subjects && formData.subjects.length > 0) {
        const subjectMarksToInsert = formData.subjects.map(subject => ({
          studentDetailId: student.id,
          subjectName: subject.subjectName,
          category: subject.category,
          maxMarks: subject.totalMarks,
          passMarks: subject.passMarks,
          theoryMarksObtained: subject.theoryMarksObtained || 0,
          practicalMarksObtained: subject.practicalMarksObtained || 0,
          obtainedTotalMarks: (subject.theoryMarksObtained || 0) + (subject.practicalMarksObtained || 0),
        }));

        await tx.studentMarksDetail.createMany({
          data: subjectMarksToInsert,
        });
      }
      return student; // Return the created student detail
    });

    return {
      success: true,
      message: 'Marksheet data saved successfully.',
      studentId: createdStudent.id,
    };

  } catch (error) {
    console.error("Error in saveMarksheetAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while saving marksheet data.";
    return {
      success: false,
      message: 'Failed to save marksheet data.',
      errorDetails: errorMessage,
    };
  }
}

export interface FetchMarksheetForEditResult {
  success: boolean;
  data?: MarksheetFormData;
  message?: string;
}

export async function fetchMarksheetForEditAction(studentSystemId: string): Promise<FetchMarksheetForEditResult> {
  try {
    const studentDetails = await prisma.studentDetail.findUnique({
      where: { id: studentSystemId },
      include: {
        marks: true, // Eager load marks
      },
    });

    if (!studentDetails) {
      return { success: false, message: `Student data not found for ID: ${studentSystemId}.` };
    }

    let sessionStartYear = new Date().getFullYear() - 1;
    let sessionEndYear = new Date().getFullYear();
    if (studentDetails.academicYear && studentDetails.academicYear.includes('-')) {
      const years = studentDetails.academicYear.split('-');
      sessionStartYear = parseInt(years[0], 10);
      sessionEndYear = parseInt(years[1], 10);
    }
    
    // Transform to MarksheetFormData
    const transformedData: MarksheetFormData = {
      system_id: studentDetails.id,
      studentName: studentDetails.name ?? '',
      fatherName: studentDetails.fatherName ?? '',
      motherName: studentDetails.motherName ?? '',
      rollNumber: studentDetails.rollNo ?? '',
      registrationNo: studentDetails.registrationNo ?? '',
      dateOfBirth: studentDetails.dob ? new Date(studentDetails.dob) : new Date(), // Ensure it's a Date object
      dateOfIssue: new Date(), // Default or fetch if stored
      gender: studentDetails.gender as MarksheetFormData['gender'] ?? 'Male',
      faculty: studentDetails.faculty as MarksheetFormData['faculty'] ?? 'Arts',
      academicYear: studentDetails.class as typeof ACADEMIC_YEAR_OPTIONS[number] ?? 'Intermediate Year 1',
      sessionStartYear: sessionStartYear,
      sessionEndYear: sessionEndYear,
      overallPassingThresholdPercentage: 33, // Default
      subjects: studentDetails.marks?.map(mark => ({
        id: mark.markId.toString(), // Use markId from DB
        subjectName: mark.subjectName ?? '',
        category: mark.category as MarksheetSubjectDisplayEntry['category'] ?? 'Compulsory',
        totalMarks: mark.maxMarks ?? 0,
        passMarks: mark.passMarks ?? 0,
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
  success: boolean;
  message: string;
  errorDetails?: string;
}

export async function updateMarksheetAction(studentSystemId: string, formData: MarksheetFormData): Promise<UpdateMarksheetResult> {
  try {
  } catch (authError: any) {
    return { success: false, message: authError.message || 'Authentication failed.' };
  }

  if (!studentSystemId) {
    return { success: false, message: "Student System ID is missing." };
  }

  try {
    const dobFormatted = format(new Date(formData.dateOfBirth), 'yyyy-MM-dd'); // Ensure date

    await prisma.$transaction(async (tx) => {
      // Update student details
      await tx.studentDetail.update({
        where: { id: studentSystemId },
        data: {
          name: formData.studentName,
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          rollNo: formData.rollNumber,
          registrationNo: formData.registrationNo,
          dob: new Date(dobFormatted), // Prisma expects Date object
          gender: formData.gender,
          faculty: formData.faculty,
          class: formData.academicYear,
          academicYear: `${formData.sessionStartYear}-${formData.sessionEndYear}`,
        },
      });

      // Delete existing marks
      await tx.studentMarksDetail.deleteMany({
        where: { studentDetailId: studentSystemId },
      });

      // Insert new marks
      if (formData.subjects && formData.subjects.length > 0) {
        const marksToInsert = formData.subjects.map(subject => ({
          studentDetailId: studentSystemId, // Link to the student
          subjectName: subject.subjectName,
          category: subject.category,
          maxMarks: subject.totalMarks,
          passMarks: subject.passMarks,
          theoryMarksObtained: subject.theoryMarksObtained || 0,
          practicalMarksObtained: subject.practicalMarksObtained || 0,
          obtainedTotalMarks: (subject.theoryMarksObtained || 0) + (subject.practicalMarksObtained || 0),
        }));
        await tx.studentMarksDetail.createMany({
          data: marksToInsert,
        });
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
  success: boolean;
  data?: MarksheetDisplayData;
  message?: string;
}

// Helper function to generate marksheet number (can be co-located or imported)
const generateMarksheetNoServer = (faculty: string, rollNumber: string, sessionEndYear: number): string => {
  const facultyCode = faculty.substring(0, 2).toUpperCase();
  const month = format(new Date(), 'MMM').toUpperCase(); // Consider if date of issue should be fixed or current
  const sequence = String(Math.floor(Math.random() * 900) + 100);
  return `${facultyCode}/${month}/${sessionEndYear}/${rollNumber.slice(-3) || sequence}`;
};

// Define ACADEMIC_YEAR_OPTIONS for proper type inference in fetchMarksheetForEditAction
// This should match your actual options defined elsewhere, e.g., in types.ts or a constants file
const ACADEMIC_YEAR_OPTIONS = ['11th', '12th', '1st Year', '2nd Year', '3rd Year'] as const;
const SUBJECT_CATEGORIES_OPTIONS = ['Compulsory', 'Elective', 'Additional'] as const;


export async function fetchMarksheetForDisplayAction(studentSystemId: string): Promise<FetchMarksheetForDisplayResult> {
  try {
    const studentDetails = await prisma.studentDetail.findUnique({
      where: { id: studentSystemId },
      include: {
        marks: true, // Eager load marks
      },
    });

    if (!studentDetails) {
      return { success: false, message: `Student data not found for ID: ${studentSystemId}.` };
    }

    // --- Start: Data processing logic (moved from client) ---
    let sessionStartYear = new Date().getFullYear() - 1;
    let sessionEndYear = new Date().getFullYear();
    if (studentDetails.academicYear && studentDetails.academicYear.includes('-')) {
      const years = studentDetails.academicYear.split('-');
      sessionStartYear = parseInt(years[0], 10);
      sessionEndYear = parseInt(years[1], 10);
    }

    // Intermediate structure similar to MarksheetFormData to hold raw DB values
    const formDataFromDb: MarksheetFormData = {
        system_id: studentDetails.id,
        studentName: studentDetails.name ?? '',
        fatherName: studentDetails.fatherName ?? '',
        motherName: studentDetails.motherName ?? '',
        registrationNo: studentDetails.registrationNo ?? '',
        rollNumber: studentDetails.rollNo ?? '',
        dateOfBirth: studentDetails.dob ? new Date(studentDetails.dob) : new Date(),
        dateOfIssue: new Date(), // Date of issue for viewing will be current date by default
        gender: studentDetails.gender as MarksheetFormData['gender'] ?? 'Male',
        faculty: studentDetails.faculty as MarksheetFormData['faculty'] ?? 'Arts',
        academicYear: studentDetails.class as typeof ACADEMIC_YEAR_OPTIONS[number] ?? '11th',
        sessionStartYear: sessionStartYear,
        sessionEndYear: sessionEndYear,
        overallPassingThresholdPercentage: 33, // Default
        subjects: studentDetails.marks?.map(mark => ({
            id: mark.markId.toString(),
            subjectName: mark.subjectName ?? '',
            category: mark.category as MarksheetSubjectDisplayEntry['category'] ?? 'Compulsory',
            totalMarks: mark.maxMarks ?? 0,
            passMarks: mark.passMarks ?? 0,
            theoryMarksObtained: mark.theoryMarksObtained ?? 0,
            practicalMarksObtained: mark.practicalMarksObtained ?? 0,
        })) || [],
    };

    const subjectsDisplay: MarksheetSubjectDisplayEntry[] = formDataFromDb.subjects.map(s => ({
      ...s,
      obtainedTotal: (s.theoryMarksObtained || 0) + (s.practicalMarksObtained || 0),
    }));

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
    if (overallPercentageDisplay < formDataFromDb.overallPassingThresholdPercentage) {
      overallResult = 'Fail';
    }
    for (const subject of subjectsDisplay) {
      if (subject.obtainedTotal < subject.passMarks) {
        overallResult = 'Fail';
        break;
      }
    }
    // --- End: Data processing logic ---


    const processedDataForDisplay: MarksheetDisplayData = {
      ...formDataFromDb, // Spreads common fields
      system_id: studentDetails.id, // ensure this comes from the DB studentDetails
      collegeCode: "53010",
      subjects: subjectsDisplay,
      sessionDisplay: `${formDataFromDb.sessionStartYear}-${formDataFromDb.sessionEndYear}`,
      classDisplay: `${formDataFromDb.academicYear}`,
      aggregateMarksCompulsoryElective,
      totalPossibleMarksCompulsoryElective,
      totalMarksInWords,
      overallResult,
      overallPercentageDisplay,
      dateOfIssue: format(new Date(formDataFromDb.dateOfIssue), 'MMMM yyyy'), // Format the date for display
      place: 'Samastipur',
      registrationNo: formDataFromDb.registrationNo, // ensure this is included
    };

    return { success: true, data: processedDataForDisplay };

  } catch (error) {
    console.error("Error in fetchMarksheetForDisplayAction:", error);
    return { success: false, message: error instanceof Error ? error.message : "Database error fetching marksheet data." };
  }
}