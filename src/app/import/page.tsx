'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client'; // KEEP for AUTH
// * XLSX is no longer needed directly on the client for parsing the whole file
import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Keep for file input trigger
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, Info, ArrowLeft } from 'lucide-react';
import type { ImportProcessingResults } from '@/types'; // StudentImportFeedbackItem, MarksImportFeedbackItem not directly needed if results are just displayed
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

// IMPORT SERVER ACTION
import { importDataAction } from '@/app/admin/actions'; // Adjust path if needed
import * as XLSX from 'xlsx'; // Keep for client-side sample file generation

const pageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

const generateAcademicSessionOptions = () => {
  // ... (same implementation)
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

// parseExcelDate is no longer needed on the client if server handles all parsing

export default function ImportDataPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportProcessingResults | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [selectedAcademicSession, setSelectedAcademicSession] = useState<string>('');

  // --- AUTHENTICATION LOGIC (NO CHANGE) ---
  useEffect(() => {
    const checkAuth = async () => {
      // ... (same implementation)
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


  // --- FILE HANDLING (NO CHANGE in selection part) ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // ... (same implementation)
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

  // --- DOWNLOAD SAMPLE (NO CHANGE) ---
  const handleDownloadSampleFile = () => {
    // ... (same implementation using client-side XLSX)
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

  // --- MODIFIED: HANDLE IMPORT ---
  const handleImport = async () => {
    if (!file) {
      toast({ title: "No File Selected", description: "Please select an Excel file to import.", variant: "destructive" });
      return;
    }
    if (!selectedAcademicSession || selectedAcademicSession === 'Select Session') {
      toast({ title: "No Session Selected", description: "Please select an Academic Session from the dropdown.", variant: "destructive" });
      return;
    }
    // Basic client-side validation for session format (server will also validate if needed)
    const academicYearParts = selectedAcademicSession.split('-');
    if (academicYearParts.length !== 2 || !/^\d{4}$/.test(academicYearParts[0].trim()) || !/^\d{4}$/.test(academicYearParts[1].trim())) {
      toast({ title: "Invalid Session Format", description: `The selected Academic Session "${selectedAcademicSession}" is not valid. Expected YYYY-YYYY.`, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setImportResults(null);
    toast({ title: "Import Started", description: "Uploading and processing your Excel file..." });

    // Read file as Base64 to send to server action
    const reader = new FileReader();
    reader.readAsDataURL(file); // Reads as Data URL (includes base64 string)
    
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        toast({ title: "File Read Error", description: "Could not read the file content for upload.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      
      // Extract base64 part from Data URL
      const base64Content = dataUrl.split(',')[1];

      try {
        // CALL SERVER ACTION
        const resultsFromServer = await importDataAction(base64Content, selectedAcademicSession);
        setImportResults(resultsFromServer);
        
        // Display a summary toast based on server results
        const overallSuccess = resultsFromServer.summaryMessages.some(m => m.type === 'success') && !resultsFromServer.summaryMessages.some(m => m.type === 'error');
        const primaryMessage = resultsFromServer.summaryMessages.find(m => m.type === 'success' || m.type === 'info' || m.type === 'error');

        toast({
            title: overallSuccess ? "Import Processed" : "Import Processed with Issues",
            description: primaryMessage?.message || "Review the details below.",
            variant: overallSuccess ? "default" : (resultsFromServer.summaryMessages.some(m => m.type === 'error') ? "destructive" : "default"),
        });

      } catch (error: any) {
        console.error("Error calling importDataAction:", error);
        toast({ title: "Import Failed", description: error.message || "An unknown error occurred during server processing.", variant: "destructive" });
        setImportResults({ // Set some basic error state for results
            summaryMessages: [{ type: 'error', message: `Client-side error calling server action: ${error.message}` }],
            studentFeedback: [], marksFeedback: [],
            totalStudentsProcessed: 0, totalStudentsAdded: 0, totalStudentsSkipped: 0,
            totalMarksProcessed: 0, totalMarksAdded: 0, totalMarksSkipped: 0,
        });
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Clear the file input
        }
        setFile(null); // Clear the file state
      }
    };

    reader.onerror = () => {
      toast({ title: "File Read Error", description: "Could not read the file to prepare for upload.", variant: "destructive" });
      setIsLoading(false);
    };
  };

  // --- LOADING STATE & JSX (NO MAJOR CHANGE, BUT DISPLAYS RESULTS FROM SERVER) ---
  if (authStatus === 'loading') {
    // ... (same loading JSX)
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
                <p>Upload an Excel file with student details and their marks.</p>
                <p>Ensure your file has two sheets: "Student Details" and "Student Marks Details".</p>
                <p>Select the <strong>Academic Session</strong> from the dropdown below. This session will be applied to all students in the imported file.</p>
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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

              {/* Results Display Section - No change in structure, just consumes data from server action */}
              {importResults && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-xl font-semibold border-b pb-2">Import Results</h3>

                  {importResults.summaryMessages.map((msg, idx) => (
                    <div key={`summary-${idx}`} className={`p-3 rounded-md text-sm flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-100 text-green-700 border border-green-300' :
                      msg.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' :
                        msg.type === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                          'bg-blue-100 text-blue-700 border border-blue-300' // info
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
                            <span className="font-semibold">Row {item.rowNumber}:</span> 
                            <span className="font-medium">Excel ID: {item.excelStudentId || 'N/A'}, Name: {item.name}</span> - 
                            <span className={`font-medium ${item.status === 'added' ? 'text-green-600' :
                              item.status === 'skipped' ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                              {item.status.toUpperCase()}
                            </span>
                            : {item.message} {item.details && `(${item.details})`} {item.generatedSystemId && `(SysID: ${item.generatedSystemId.substring(0,8)}...)`}
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
                            <span className="font-semibold">Row {item.rowNumber}:</span> 
                            Excel Student ID: <span className="font-medium">{item.excelStudentId || 'N/A'}</span>, Name: <span className="font-medium">{item.studentName}</span>, Subject: <span className="font-medium">{item.subjectName}</span> - 
                            <span className={`font-medium ${item.status === 'added' ? 'text-green-600' :
                              item.status === 'skipped' ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                              {item.status.toUpperCase()}
                            </span>
                            : {item.message} {item.details && `(${item.details})`}
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