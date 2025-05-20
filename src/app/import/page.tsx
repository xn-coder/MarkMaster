
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import { format, parse, isValid, parseISO } from 'date-fns';
import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Kept for type consistency, though hidden
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Download, Info } from 'lucide-react';
import type { ImportProcessingResults, StudentImportFeedbackItem, MarksImportFeedbackItem, GeneralImportMessage } from '@/types';

const pageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

// Helper to parse various date formats from Excel
const parseExcelDate = (excelDate: any): string | null => {
  if (typeof excelDate === 'number') { // Excel serial date
    const date = XLSX.SSF.parse_date_code(excelDate);
    if (date) {
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      return `${date.y}-${month}-${day}`; // Format as YYYY-MM-DD
    }
  } else if (typeof excelDate === 'string') {
    // Try common date formats
    const formatsToTry = ["yyyy-MM-dd", "dd-MM-yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy/MM/dd"];
    for (const fmt of formatsToTry) {
      try {
        const parsedDate = parse(excelDate, fmt, new Date());
        if (isValid(parsedDate)) {
          return format(parsedDate, 'yyyy-MM-dd');
        }
      } catch (e) { /* ignore parse error and try next format */ }
    }
    // Try ISO format as a fallback
    if (isValid(parseISO(excelDate))) {
      return format(parseISO(excelDate), 'yyyy-MM-dd');
    }
  }
  return null; // Return null if date is invalid or unparseable
};


export default function ImportDataPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportProcessingResults | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

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
        setAuthStatus('unauthenticated'); // Fallback to unauthenticated on error
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
        setImportResults(null); // Clear previous results
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
    const studentDetailsHeaders = ["Student ID", "Student Name", "Father Name", "Mother Name", "Date of Birth", "Gender", "Faculty", "Class", "Section", "Academic Session"];
    const sampleStudentRow = ["S001", "John Doe", "Robert Doe", "Jane Doe", "15-07-2003", "Male", "SCIENCE", "12th", "B", "2024-2026"];
    
    const studentMarksHeaders = ["Name", "Subject Name", "Subject Category", "Max Marks", "Pass Marks", "Theory Marks Obtained", "Practical Marks Obtained"];
    const sampleMarkRow = ["John Doe", "Physics", "Elective", 100, 33, 65, 25]; // Name matches Student Name in sampleStudentRow

    const studentDetailsData = [studentDetailsHeaders, sampleStudentRow];
    const studentMarksData = [studentMarksHeaders, sampleMarkRow];

    const wsStudentDetails = XLSX.utils.aoa_to_sheet(studentDetailsData);
    const wsStudentMarks = XLSX.utils.aoa_to_sheet(studentMarksData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsStudentDetails, "Student Details");
    XLSX.utils.book_append_sheet(workbook, wsStudentMarks, "Student Marks Details");

    XLSX.writeFile(workbook, "sample-import-template.xlsx");
    toast({ title: "Sample File Downloading", description: "sample-import-template.xlsx should start downloading."});
  };

  const handleImport = async () => {
    if (!file) {
      toast({ title: "No File Selected", description: "Please select an Excel file to import.", variant: "destructive" });
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
      
      const studentNameToDbIdMap = new Map<string, string>(); // Maps Student Name (from Excel) to Student ID (from Excel, used as DB ID)

      try {
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });

        // --- Process Student Details Sheet ---
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
            const rowNum = i + 2; // Excel row number (assuming header is row 1)
            
            const studentIdFromExcel = String(row['Student ID'] || '').trim();
            const studentName = String(row['Student Name'] || '').trim();
            const fatherName = String(row['Father Name'] || '').trim();
            const motherName = String(row['Mother Name'] || '').trim();
            const dobRaw = row['Date of Birth'];
            const gender = String(row['Gender'] || '').trim();
            const faculty = String(row['Faculty'] || '').trim();
            const studentClass = String(row['Class'] || '').trim();
            const section = String(row['Section'] || '').trim();
            const academicSession = String(row['Academic Session'] || '').trim();

            const currentFeedback: StudentImportFeedbackItem = { rowNumber: rowNum, name: studentName, studentId: studentIdFromExcel, status: 'skipped', message: ''};

            if (!studentIdFromExcel || !studentName || !fatherName || !motherName || !dobRaw || !gender || !faculty || !studentClass || !section || !academicSession) {
              currentFeedback.message = "Missing one or more required fields (Student ID, Student Name, Father Name, Mother Name, DOB, Gender, Faculty, Class, Section, Academic Session).";
              results.studentFeedback.push(currentFeedback);
              results.totalStudentsSkipped++;
              continue;
            }
            
            const dobFormatted = parseExcelDate(dobRaw);
            if (!dobFormatted) {
              currentFeedback.message = `Invalid Date of Birth format: ${dobRaw}.`;
              results.studentFeedback.push(currentFeedback);
              results.totalStudentsSkipped++;
              continue;
            }

            const academicYearParts = academicSession.split('-');
             if (academicYearParts.length !== 2 || !/^\d{4}$/.test(academicYearParts[0].trim()) || !/^\d{4}$/.test(academicYearParts[1].trim())) {
              currentFeedback.message = `Invalid Academic Session format: ${academicSession}. Expected YYYY-YYYY.`;
              results.studentFeedback.push(currentFeedback);
              results.totalStudentsSkipped++;
              continue;
            }
            
            studentNameToDbIdMap.set(studentName, studentIdFromExcel); // Map Student Name to the Excel-provided Student ID

            studentInserts.push({
              student_id: studentIdFromExcel, // Use Excel Student ID as DB student_id
              roll_no: studentIdFromExcel,    // Use Excel Student ID as DB roll_no
              name: studentName,
              father_name: fatherName,
              mother_name: motherName,
              dob: dobFormatted,
              gender: gender,
              faculty: faculty,
              class: studentClass, 
              section: section,
              academic_year: academicSession, 
            });
            currentFeedback.status = 'added'; 
            currentFeedback.studentId = studentIdFromExcel;
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
                const feedback = results.studentFeedback.find(f => f.studentId === si.student_id);
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
                 const feedback = results.studentFeedback.find(f => f.studentId === is.student_id && f.status === 'added');
                 if (feedback) {
                   feedback.message = 'Successfully added to database.';
                 }
               });
            }
             results.totalStudentsSkipped = results.totalStudentsProcessed - results.totalStudentsAdded;
          } else {
             results.totalStudentsSkipped = results.totalStudentsProcessed; 
          }
        }

        // --- Process Student Marks Details Sheet ---
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

            const studentNameForMarks = String(row['Name'] || '').trim(); // Still linking by "Name" from marks sheet
            const subjectName = String(row['Subject Name'] || '').trim(); 
            const subjectCategory = String(row['Subject Category'] || '').trim();
            const maxMarksRaw = row['Max Marks'];
            const passMarksRaw = row['Pass Marks'];
            const theoryMarksRaw = row['Theory Marks Obtained'];
            const practicalMarksRaw = row['Practical Marks Obtained'];

            const currentFeedback: MarksImportFeedbackItem = { rowNumber: rowNum, studentName: studentNameForMarks, subjectName: subjectName, status: 'skipped', message: '' };

            const maxMarks = parseFloat(String(maxMarksRaw));
            const passMarks = parseFloat(String(passMarksRaw));
            const theoryMarks = parseFloat(String(theoryMarksRaw));
            const practicalMarks = parseFloat(String(practicalMarksRaw));


            if (!studentNameForMarks || !subjectName || !subjectCategory || isNaN(maxMarks) || isNaN(passMarks)) {
              currentFeedback.message = "Missing required fields (Name, Subject Name, Subject Category) or invalid Max/Pass Marks.";
              results.marksFeedback.push(currentFeedback);
              results.totalMarksSkipped++;
              continue;
            }
            
            const dbStudentId = studentNameToDbIdMap.get(studentNameForMarks); // Get the actual DB student_id (which was Student ID from Excel)
            if (!dbStudentId) {
              currentFeedback.message = `Student "${studentNameForMarks}" not found in 'Student Details' sheet (based on 'Student Name' to 'Student ID' mapping) or not added. Marks for this subject skipped.`;
              results.marksFeedback.push(currentFeedback);
              results.totalMarksSkipped++;
              continue;
            }
            
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
              student_id: dbStudentId, // Use the mapped DB student_id
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
                 // Find feedback based on the original student name used for linking from the marks sheet
                const feedback = results.marksFeedback.find(f => 
                    f.studentName === Array.from(studentNameToDbIdMap.entries()).find(([,id]) => id === mi.student_id)?.[0] && 
                    f.subjectName === mi.subject_name && 
                    f.status === 'added'
                );
                if(feedback) {
                    feedback.status = 'error';
                    feedback.message = `Database insert failed: ${marksInsertError.message}`;
                }
              });
              results.totalMarksAdded = 0; 
            } else {
              results.totalMarksAdded = insertedMarks?.length || 0;
              results.summaryMessages.push({ type: 'success', message: `${results.totalMarksAdded} marks records successfully inserted.` });
              insertedMarks?.forEach(im => {
                 const studentNameFromMap = Array.from(studentNameToDbIdMap.entries()).find(([,id]) => id === im.student_id)?.[0] || "Unknown Student";
                 const feedback = results.marksFeedback.find(f => 
                    f.studentName === studentNameFromMap && 
                    f.subjectName === im.subject_name && 
                    f.status === 'added'
                 );
                 if(feedback) {
                    feedback.message = 'Successfully added to database.';
                 }
              });
            }
             results.totalMarksSkipped = results.totalMarksProcessed - results.totalMarksAdded;
          } else {
             results.totalMarksSkipped = results.totalMarksProcessed; 
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
      <AppHeader
        pageTitle="SARYUG COLLEGE"
        pageSubtitle={pageSubtitle}
        customRightContent={
          <Button variant="outline" onClick={() => router.push('/')} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        }
      />
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Import Student Data</CardTitle>
            <CardDescription className="space-y-1">
              <p>
                Upload an Excel file with student details and their marks.
                Ensure your file has two sheets: "Student Details" and "Student Marks Details".
              </p>
              <p>
                Required columns for "Student Details": Student ID, Student Name, Father Name, Mother Name, Date of Birth, Gender, Faculty, Class, Section, Academic Session. Student ID will be used as the Roll Number.
              </p>
              <p>
                Required columns for "Student Marks Details": Name (must match a "Student Name" in Student Details sheet), Subject Name, Subject Category, Max Marks, Pass Marks. Optional: Theory Marks Obtained, Practical Marks Obtained.
              </p>
            </CardDescription>
             <Button variant="link" onClick={handleDownloadSampleFile} className="p-0 h-auto self-start text-sm mt-2">
              <Download className="mr-2 h-4 w-4" /> Download Sample Template
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
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
            <Button onClick={handleImport} className="w-full" disabled={!file || isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
              Import File
            </Button>

            {importResults && (
              <div className="mt-6 space-y-4">
                <h3 className="text-xl font-semibold border-b pb-2">Import Results</h3>
                
                {importResults.summaryMessages.map((msg, idx) => (
                  <div key={`summary-${idx}`} className={`p-3 rounded-md text-sm flex items-center gap-2 ${
                    msg.type === 'success' ? 'bg-green-100 text-green-700 border border-green-300' :
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
                  <p className="text-sm text-muted-foreground">Added: {importResults.totalStudentsAdded}, Skipped/Errors: {importResults.totalStudentsSkipped + importResults.studentFeedback.filter(f=>f.status === 'error' && !(f.message.startsWith('Database insert failed'))).length}</p>
                  {importResults.studentFeedback.length > 0 && (
                    <ScrollArea className="h-60 mt-2 border rounded-md p-2">
                      {importResults.studentFeedback.map((item, idx) => (
                        <div key={`student-${idx}`} className="text-xs p-1.5 border-b last:border-b-0 flex items-start">
                           {item.status === 'added' && <CheckCircle className="h-3.5 w-3.5 text-green-600 mr-1.5 flex-shrink-0" />}
                           {item.status === 'skipped' && <AlertTriangle className="h-3.5 w-3.5 text-yellow-700 mr-1.5 flex-shrink-0" />}
                           {item.status === 'error' && <XCircle className="h-3.5 w-3.5 text-red-600 mr-1.5 flex-shrink-0" />}
                          <span className="font-semibold">Row {item.rowNumber}:</span>&nbsp;
                          <span className="font-medium">ID: {item.studentId || 'N/A'}, Name: {item.name}</span>&nbsp;-&nbsp; 
                          <span className={`font-medium ${
                            item.status === 'added' ? 'text-green-600' :
                            item.status === 'skipped' ? 'text-yellow-700' :
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

                <Separator />

                <div>
                  <h4 className="text-lg font-medium">Marks Details Feedback ({importResults.totalMarksProcessed} rows processed)</h4>
                   <p className="text-sm text-muted-foreground">Added: {importResults.totalMarksAdded}, Skipped/Errors: {importResults.totalMarksSkipped + importResults.marksFeedback.filter(f=>f.status === 'error' && !(f.message.startsWith('Database insert failed'))).length}</p>
                  {importResults.marksFeedback.length > 0 && (
                    <ScrollArea className="h-60 mt-2 border rounded-md p-2">
                      {importResults.marksFeedback.map((item, idx) => (
                        <div key={`mark-${idx}`} className="text-xs p-1.5 border-b last:border-b-0 flex items-start">
                           {item.status === 'added' && <CheckCircle className="h-3.5 w-3.5 text-green-600 mr-1.5 flex-shrink-0" />}
                           {item.status === 'skipped' && <AlertTriangle className="h-3.5 w-3.5 text-yellow-700 mr-1.5 flex-shrink-0" />}
                           {item.status === 'error' && <XCircle className="h-3.5 w-3.5 text-red-600 mr-1.5 flex-shrink-0" />}
                          <span className="font-semibold">Row {item.rowNumber}:</span>&nbsp;
                          Student <span className="font-medium">{item.studentName}</span>, Subject <span className="font-medium">{item.subjectName}</span>&nbsp;-&nbsp;
                           <span className={`font-medium ${
                            item.status === 'added' ? 'text-green-600' :
                            item.status === 'skipped' ? 'text-yellow-700' :
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
      </main>
       <footer className="py-4 border-t border-border mt-auto print:hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground">
            <p>Copyright ©{new Date().getFullYear()} by Saryug College, Samastipur, Bihar. Design By Mantix.</p>
        </div>
      </footer>
    </div>
  );
}
