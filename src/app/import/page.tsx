
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import { format, parse, isValid, parseISO } from 'date-fns';
import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, Info, ArrowLeft } from 'lucide-react';
import type { ImportProcessingResults, StudentImportFeedbackItem, MarksImportFeedbackItem } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';


const pageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

const generateAcademicSessionOptions = () => {
  const currentYear = new Date().getFullYear();
  const startYear = 1970;
  const endYear = currentYear + 2;
  const options = ['Select Session'];
  for (let i = startYear; i <= endYear; i++) {
    options.push(`${i}-${i + 1}`);
  }
  return options.reverse();
};

const ACADEMIC_SESSION_OPTIONS = generateAcademicSessionOptions();

const parseExcelDate = (excelDate: any): string | null => {
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
      } catch (e) { /* ignore parse error and try next format */ }
    }
    if (isValid(parseISO(excelDate))) {
      return format(parseISO(excelDate), 'yyyy-MM-dd');
    }
  }
  return null;
};


export default function ImportDataPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportProcessingResults | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [selectedAcademicSession, setSelectedAcademicSession] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
          router.push('/login');
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setAuthStatus('unauthenticated');
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.type === 'application/vnd.ms-excel') {
        setFile(selectedFile);
        setImportResults(null);
      } else {
        toast({ title: "Invalid File Type", description: "Please select an Excel file (.xlsx or .xls).", variant: "destructive" });
        setFile(null);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadSampleFile = () => {
    const studentDetailsHeaders = ["Student ID", "Student Name", "Father Name", "Mother Name", "Date of Birth", "Gender", "Registration No", "Faculty", "Class"];
    const sampleStudentRow = ["S001", "John Doe", "Robert Doe", "Jane Doe", "15-07-2003", "Male", "REG001", "SCIENCE", "12th"];

    const studentMarksHeaders = ["Student ID", "Name", "Subject Name", "Subject Category", "Max Marks", "Pass Marks", "Theory Marks Obtained", "Practical Marks Obtained"];
    const sampleMarkRow = ["S001", "John Doe", "Physics", "Elective", 100, 33, 65, 25];

    const studentDetailsData = [studentDetailsHeaders, sampleStudentRow];
    const studentMarksData = [studentMarksHeaders, sampleMarkRow];

    const wsStudentDetails = XLSX.utils.aoa_to_sheet(studentDetailsData);
    const wsStudentMarks = XLSX.utils.aoa_to_sheet(studentMarksData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsStudentDetails, "Student Details");
    XLSX.utils.book_append_sheet(workbook, wsStudentMarks, "Student Marks Details");

    XLSX.writeFile(workbook, "sample-import-template.xlsx");
    toast({ title: "Sample File Downloading", description: "sample-import-template.xlsx should start downloading." });
  };

  const handleImport = async () => {
    if (!file) {
      toast({ title: "No File Selected", description: "Please select an Excel file to import.", variant: "destructive" });
      return;
    }
    if (!selectedAcademicSession || selectedAcademicSession === 'Select Session') {
      toast({ title: "No Session Selected", description: "Please select an Academic Session from the dropdown.", variant: "destructive" });
      return;
    }

    const academicYearParts = selectedAcademicSession.split('-');
    if (academicYearParts.length !== 2 || !/^\d{4}$/.test(academicYearParts[0].trim()) || !/^\d{4}$/.test(academicYearParts[1].trim())) {
      toast({ title: "Invalid Session Format", description: `The selected Academic Session "${selectedAcademicSession}" is not valid. Expected YYYY-YYYY.`, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setImportResults(null);
    toast({ title: "Import Started", description: "Processing your Excel file..." });

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result;
      if (!data) {
        toast({ title: "File Read Error", description: "Could not read the file content.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

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
      const processedSubjectKeysForImport = new Set<string>();

      try {
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });

        const studentDetailsSheetName = 'Student Details';
        const studentDetailsSheet = workbook.Sheets[studentDetailsSheetName];
        if (!studentDetailsSheet) {
          results.summaryMessages.push({ type: 'error', message: `Sheet "${studentDetailsSheetName}" not found in the Excel file.` });
        } else {
          const studentDetailsJson = XLSX.utils.sheet_to_json<any>(studentDetailsSheet, { raw: false, defval: null });
          results.totalStudentsProcessed = studentDetailsJson.length;
          const studentInserts = [];

          for (let i = 0; i < studentDetailsJson.length; i++) {
            const row = studentDetailsJson[i];
            const rowNum = i + 2;

            const excelStudentId = String(row['Student ID'] || '').trim();
            const studentName = String(row['Student Name'] || '').trim();
            const fatherName = String(row['Father Name'] || '').trim();
            const motherName = String(row['Mother Name'] || '').trim();
            const dobRaw = row['Date of Birth'];
            const gender = String(row['Gender'] || '').trim();
            const registrationNo = String(row['Registration No'] || '').trim();
            const faculty = String(row['Faculty'] || '').trim();
            const studentClass = String(row['Class'] || '').trim();
            
            const currentFeedback: StudentImportFeedbackItem = { rowNumber: rowNum, excelStudentId: excelStudentId, name: studentName, status: 'skipped', message: '' };

            if (!excelStudentId || !studentName || !fatherName || !motherName || !dobRaw || !gender || !faculty || !studentClass || !registrationNo) {
              currentFeedback.message = "Missing one or more required fields (Student ID, Student Name, Father Name, Mother Name, DOB, Gender, Registration No, Faculty, Class).";
              results.studentFeedback.push(currentFeedback);
              results.totalStudentsSkipped++;
              continue;
            }

            const dobFormatted = parseExcelDate(dobRaw);
            if (!dobFormatted) {
              currentFeedback.message = `Invalid Date of Birth format: ${dobRaw}. Ensure it is a valid date.`;
              results.studentFeedback.push(currentFeedback);
              results.totalStudentsSkipped++;
              continue;
            }

            const { data: existingStudent, error: checkError } = await supabase
              .from('student_details')
              .select('id')
              .eq('roll_no', excelStudentId)
              .eq('academic_year', selectedAcademicSession)
              .eq('class', studentClass)
              .eq('faculty', faculty)
              .eq('registration_no', registrationNo)
              .maybeSingle();

            if (checkError) {
              currentFeedback.status = 'error';
              currentFeedback.message = `Database error checking for existing student: ${checkError.message}`;
              results.studentFeedback.push(currentFeedback);
              results.totalStudentsSkipped++;
              continue;
            }

            if (existingStudent) {
              currentFeedback.message = `Student with Roll No ${excelStudentId}, Reg No ${registrationNo} in Session ${selectedAcademicSession}, Class ${studentClass}, Faculty ${faculty} already exists. Skipped.`;
              results.studentFeedback.push(currentFeedback);
              results.totalStudentsSkipped++;
              excelStudentIdToSystemIdMap.set(excelStudentId, existingStudent.id); 
              continue;
            }

            if (excelStudentIdToSystemIdMap.has(excelStudentId)) {
                currentFeedback.message = `Duplicate Student ID "${excelStudentId}" found within the 'Student Details' sheet. Only the first instance will be processed for mapping marks.`;
                results.studentFeedback.push(currentFeedback);
                results.totalStudentsSkipped++;
                continue;
            }

            const systemGeneratedId = crypto.randomUUID();
            excelStudentIdToSystemIdMap.set(excelStudentId, systemGeneratedId);
            currentFeedback.generatedSystemId = systemGeneratedId;

            studentInserts.push({
              id: systemGeneratedId,
              roll_no: excelStudentId,
              name: studentName,
              father_name: fatherName,
              mother_name: motherName,
              dob: dobFormatted,
              gender: gender,
              registration_no: registrationNo,
              faculty: faculty,
              class: studentClass,
              academic_year: selectedAcademicSession,
            });
            currentFeedback.status = 'added';
            currentFeedback.message = 'Pending database insertion.';
            results.studentFeedback.push(currentFeedback);
          }

          if (studentInserts.length > 0) {
            const { error: studentInsertError, data: insertedStudents } = await supabase
              .from('student_details')
              .insert(studentInserts)
              .select();

            if (studentInsertError) {
              results.summaryMessages.push({ type: 'error', message: `Error inserting student details: ${studentInsertError.message}` });
              studentInserts.forEach(si => {
                const feedback = results.studentFeedback.find(f => f.generatedSystemId === si.id && f.status === 'added');
                if (feedback) {
                  feedback.status = 'error';
                  feedback.message = `Database insert failed: ${studentInsertError.message}`;
                }
              });
              results.totalStudentsAdded = 0;
            } else {
              results.totalStudentsAdded = insertedStudents?.length || 0;
              results.summaryMessages.push({ type: 'success', message: `${results.totalStudentsAdded} student(s) details successfully prepared for insertion or inserted.` });
              insertedStudents?.forEach(is => {
                const feedback = results.studentFeedback.find(f => f.generatedSystemId === is.id && f.status === 'added');
                if (feedback) {
                  feedback.message = 'Successfully added to database.';
                }
              });
            }
            results.totalStudentsSkipped = results.totalStudentsProcessed - results.totalStudentsAdded;
          } else {
            results.totalStudentsSkipped = results.totalStudentsProcessed;
            if (results.totalStudentsProcessed > 0 && studentInserts.length === 0 && results.studentFeedback.every(f => f.message.includes('already exists') || f.message.includes('Duplicate Student ID'))) {
                 results.summaryMessages.push({ type: 'info', message: `No new student details were prepared for insertion. All ${results.totalStudentsProcessed} rows were duplicates or already exist in the database with the same key identifiers.` });
            } else if (results.totalStudentsProcessed > 0) {
                 results.summaryMessages.push({ type: 'info', message: `No student details were prepared for insertion. All ${results.totalStudentsProcessed} rows had issues or were duplicates.` });
            }
          }
        }

        const studentMarksSheetName = 'Student Marks Details';
        const studentMarksSheet = workbook.Sheets[studentMarksSheetName];
        if (!studentMarksSheet) {
          results.summaryMessages.push({ type: 'warning', message: `Sheet "${studentMarksSheetName}" not found. Marks were not imported.` });
        } else {
          const studentMarksJson = XLSX.utils.sheet_to_json<any>(studentMarksSheet, { raw: false, defval: null });
          results.totalMarksProcessed = studentMarksJson.length;
          const marksInserts = [];

          for (let i = 0; i < studentMarksJson.length; i++) {
            const row = studentMarksJson[i];
            const rowNum = i + 2;

            const excelStudentIdForMarks = String(row['Student ID'] || '').trim();
            const studentNameForFeedback = String(row['Name'] || '').trim();
            const subjectName = String(row['Subject Name'] || '').trim();
            const subjectCategory = String(row['Subject Category'] || '').trim();
            const maxMarksRaw = row['Max Marks'];
            const passMarksRaw = row['Pass Marks'];
            const theoryMarksRaw = row['Theory Marks Obtained'];
            const practicalMarksRaw = row['Practical Marks Obtained'];

            const currentFeedback: MarksImportFeedbackItem = { rowNumber: rowNum, excelStudentId: excelStudentIdForMarks, studentName: studentNameForFeedback, subjectName: subjectName, status: 'skipped', message: '' };

            if (!excelStudentIdForMarks || !subjectName || !subjectCategory) {
              currentFeedback.message = "Missing required fields (Student ID, Subject Name, Subject Category).";
              results.marksFeedback.push(currentFeedback);
              results.totalMarksSkipped++;
              continue;
            }

            const systemIdForMarks = excelStudentIdToSystemIdMap.get(excelStudentIdForMarks);
            if (!systemIdForMarks) {
              currentFeedback.message = `Student ID "${excelStudentIdForMarks}" not found in 'Student Details' sheet (from current file) or was invalid/skipped. Marks for this subject skipped.`;
              results.marksFeedback.push(currentFeedback);
              results.totalMarksSkipped++;
              continue;
            }

            const subjectKey = `${systemIdForMarks}_${subjectName.trim().toLowerCase()}`;
            if (processedSubjectKeysForImport.has(subjectKey)) {
              currentFeedback.message = `Duplicate subject "${subjectName}" for Student ID "${excelStudentIdForMarks}" (System ID: ${systemIdForMarks}) in this file. Skipped.`;
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
            processedSubjectKeysForImport.add(subjectKey);

            const obtainedTotalMarks = (isNaN(theoryMarks) ? 0 : theoryMarks) + (isNaN(practicalMarks) ? 0 : practicalMarks);

            if (obtainedTotalMarks > maxMarks) {
              currentFeedback.message = `Obtained marks (${obtainedTotalMarks}) exceed Max Marks (${maxMarks}).`;
              results.marksFeedback.push(currentFeedback);
              results.totalMarksSkipped++;
              continue;
            }
            if (passMarks > maxMarks) {
              currentFeedback.message = `Pass Marks (${passMarks}) exceed Max Marks (${maxMarks}).`;
              results.marksFeedback.push(currentFeedback);
              results.totalMarksSkipped++;
              continue;
            }

            marksInserts.push({
              student_detail_id: systemIdForMarks,
              subject_name: subjectName,
              category: subjectCategory,
              max_marks: maxMarks,
              pass_marks: passMarks,
              theory_marks_obtained: isNaN(theoryMarks) ? null : theoryMarks,
              practical_marks_obtained: isNaN(practicalMarks) ? null : practicalMarks,
              obtained_total_marks: obtainedTotalMarks,
            });
            currentFeedback.status = 'added';
            currentFeedback.message = 'Pending database insertion.';
            results.marksFeedback.push(currentFeedback);
          }

          if (marksInserts.length > 0) {
            const { error: marksInsertError, data: insertedMarks } = await supabase
              .from('student_marks_details')
              .insert(marksInserts)
              .select();

            if (marksInsertError) {
              results.summaryMessages.push({ type: 'error', message: `Error inserting marks details: ${marksInsertError.message}` });
              marksInserts.forEach(mi => {
                const feedback = results.marksFeedback.find(f =>
                  Array.from(excelStudentIdToSystemIdMap.entries()).find(([, sysId]) => sysId === mi.student_detail_id)?.[0] === f.excelStudentId &&
                  f.subjectName === mi.subject_name &&
                  f.status === 'added'
                );
                if (feedback) {
                  feedback.status = 'error';
                  feedback.message = `Database insert failed: ${marksInsertError.message}`;
                }
              });
              results.totalMarksAdded = 0;
            } else {
              results.totalMarksAdded = insertedMarks?.length || 0;
              results.summaryMessages.push({ type: 'success', message: `${results.totalMarksAdded} marks records successfully inserted.` });
              insertedMarks?.forEach(im => {
                 const feedback = results.marksFeedback.find(f =>
                    Array.from(excelStudentIdToSystemIdMap.entries()).some(([excelId, sysId]) =>
                        sysId === im.student_detail_id &&
                        f.excelStudentId === excelId &&
                        f.subjectName === im.subject_name &&
                        f.status === 'added'
                    )
                );
                if (feedback) {
                  feedback.message = 'Successfully added to database.';
                }
              });
            }
             results.totalMarksSkipped = results.totalMarksProcessed - results.totalMarksAdded;
          } else {
            results.totalMarksSkipped = results.totalMarksProcessed;
            if (results.totalMarksProcessed > 0) {
              results.summaryMessages.push({ type: 'info', message: `No marks details were prepared for insertion. All ${results.totalMarksProcessed} rows had issues.` });
            }
          }
        }
        toast({ title: "Import Processed", description: "Review the details below." });
      } catch (error: any) {
        console.error("Error during Excel import processing:", error);
        results.summaryMessages.push({ type: 'error', message: `Import failed: ${error.message || "An unknown error occurred."}` });
        toast({ title: "Import Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });
      } finally {
        setImportResults(results);
        setIsLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setFile(null);
      }
    };
    reader.onerror = () => {
      toast({ title: "File Read Error", description: "Could not read the file.", variant: "destructive" });
      setIsLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader pageSubtitle={pageSubtitle} />
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-screen-xl">
        <div className="flex justify-start mb-6">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        </div>
        <div className="max-w-3xl mx-auto"> 
          <Card> 
            <CardHeader>
              <CardTitle className="text-2xl">Import Student Data</CardTitle>
              <CardDescription className="space-y-1">
                <p>
                  Upload an Excel file with student details and their marks.
                </p>
                <p>
                  Ensure your file has two sheets: "Student Details" and "Student Marks Details".
                </p>
                 <p>
                  Select the <strong>Academic Session</strong> from the dropdown below. This session will be applied to all students in the imported file.
                </p>
              </CardDescription>
              <Button variant="link" onClick={handleDownloadSampleFile} className="p-0 h-auto self-start text-sm mt-2">
                <Download className="mr-2 h-4 w-4" /> Download Sample Template
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="academic-session-select">Academic Session</Label>
                <Select
                  value={selectedAcademicSession}
                  onValueChange={setSelectedAcademicSession}
                >
                  <SelectTrigger id="academic-session-select" className="w-full">
                    <SelectValue placeholder="Select Academic Session" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_SESSION_OPTIONS.map(session => (
                      <SelectItem key={session} value={session} disabled={session === 'Select Session'}>
                        {session}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".xlsx, .xls"
                />
                <Button onClick={triggerFileInput} variant="outline" className="w-full" disabled={isLoading}>
                  <FileText className="mr-2 h-5 w-5" />
                  {file ? `Selected: ${file.name}` : 'Select Excel File'}
                </Button>
                {file && (
                  <p className="text-xs text-muted-foreground text-center">
                    File: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
              <Button
                onClick={handleImport}
                className="w-full"
                disabled={!file || isLoading || !selectedAcademicSession || selectedAcademicSession === 'Select Session'}
              >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
                Import File
              </Button>

              {importResults && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-xl font-semibold border-b pb-2">Import Results</h3>

                  {importResults.summaryMessages.map((msg, idx) => (
                    <div key={`summary-${idx}`} className={`p-3 rounded-md text-sm flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-100 text-green-700 border border-green-300' :
                      msg.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' :
                        msg.type === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                          'bg-blue-100 text-blue-700 border border-blue-300'
                      }`}>
                      {msg.type === 'success' && <CheckCircle className="h-5 w-5" />}
                      {msg.type === 'error' && <XCircle className="h-5 w-5" />}
                      {msg.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
                      {msg.type === 'info' && <Info className="h-5 w-5" />}
                      {msg.message}
                    </div>
                  ))}

                  <Separator />

                  <div>
                    <h4 className="text-lg font-medium">Student Details Feedback ({importResults.totalStudentsProcessed} rows processed)</h4>
                    <p className="text-sm text-muted-foreground">Added: {importResults.totalStudentsAdded}, Skipped/Errors: {importResults.totalStudentsSkipped}</p>
                    {importResults.studentFeedback.length > 0 && (
                      <ScrollArea className="h-60 mt-2 border rounded-md p-2">
                        {importResults.studentFeedback.map((item, idx) => (
                          <div key={`student-${idx}`} className="text-xs p-1.5 border-b last:border-b-0 flex items-start">
                            {item.status === 'added' && <CheckCircle className="h-3.5 w-3.5 text-green-600 mr-1.5 flex-shrink-0" />}
                            {item.status === 'skipped' && <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 mr-1.5 flex-shrink-0" />}
                            {item.status === 'error' && <XCircle className="h-3.5 w-3.5 text-red-600 mr-1.5 flex-shrink-0" />}
                            <span className="font-semibold">Row {item.rowNumber}:</span>&nbsp;
                            <span className="font-medium">Excel ID: {item.excelStudentId || 'N/A'}, Name: {item.name}</span>&nbsp;-&nbsp;
                            <span className={`font-medium ${item.status === 'added' ? 'text-green-600' :
                              item.status === 'skipped' ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                              {item.status.toUpperCase()}
                            </span>
                            :&nbsp;{item.message} {item.details && `(${item.details})`} {item.generatedSystemId && `(SysID: ${item.generatedSystemId.substring(0,8)}...)`}
                          </div>
                        ))}
                      </ScrollArea>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-lg font-medium">Marks Details Feedback ({importResults.totalMarksProcessed} rows processed)</h4>
                    <p className="text-sm text-muted-foreground">Added: {importResults.totalMarksAdded}, Skipped/Errors: {importResults.totalMarksSkipped}</p>
                    {importResults.marksFeedback.length > 0 && (
                      <ScrollArea className="h-60 mt-2 border rounded-md p-2">
                        {importResults.marksFeedback.map((item, idx) => (
                          <div key={`mark-${idx}`} className="text-xs p-1.5 border-b last:border-b-0 flex items-start">
                            {item.status === 'added' && <CheckCircle className="h-3.5 w-3.5 text-green-600 mr-1.5 flex-shrink-0" />}
                            {item.status === 'skipped' && <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 mr-1.5 flex-shrink-0" />}
                            {item.status === 'error' && <XCircle className="h-3.5 w-3.5 text-red-600 mr-1.5 flex-shrink-0" />}
                            <span className="font-semibold">Row {item.rowNumber}:</span>&nbsp;
                            Excel Student ID: <span className="font-medium">{item.excelStudentId || 'N/A'}</span>, Name: <span className="font-medium">{item.studentName}</span>, Subject: <span className="font-medium">{item.subjectName}</span>&nbsp;-&nbsp;
                            <span className={`font-medium ${item.status === 'added' ? 'text-green-600' :
                              item.status === 'skipped' ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                              {item.status.toUpperCase()}
                            </span>
                            :&nbsp;{item.message} {item.details && `(${item.details})`}
                          </div>
                        ))}
                      </ScrollArea>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="py-4 border-t border-border mt-auto print:hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground max-w-screen-xl">
          <p>Copyright ©{new Date().getFullYear()} by Saryug College, Samastipur, Bihar. Design By Mantix.</p>
        </div>
      </footer>
    </div>
  );
}

