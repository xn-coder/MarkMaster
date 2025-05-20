
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppHeader } from '@/components/app/app-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RefreshCw,
  FilePlus2,
  Upload,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, parse, isValid, parseISO } from 'date-fns';

interface StudentRowData {
  id: string;
  name: string;
  academicYear: string; // Session like "2025-2027"
  studentClass: string; // Class like "11th", "1st Year"
  faculty: string;
}

const ACADEMIC_YEARS = ['All Academic Years', '2025-2027', '2024-2028', '2024-2026', '2023-2025', '2022-2024', '2022-2023', '2021-2023', '2021-2022', '2018-2019'];
const START_YEARS = ['All Start Years', ...Array.from({ length: new Date().getFullYear() + 1 - 2018 + 1 }, (_, i) => (2018 + i).toString()).reverse()];
const END_YEARS = ['All End Years', ...Array.from({ length: new Date().getFullYear() + 2 - 2019 + 1 }, (_, i) => (2019 + i).toString()).reverse()];
const CLASSES = ['All Classes', '1st Year', '2nd Year', '3rd Year', '10th', '11th', '12th', 'B.A.', 'B.Com', 'B.Tech'];

const dashboardSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const [allStudents, setAllStudents] = useState<StudentRowData[]>([]);
  const [displayedStudents, setDisplayedStudents] = useState<StudentRowData[]>([]);

  const [academicYearFilter, setAcademicYearFilter] = useState('All Academic Years');
  const [startYearFilter, setStartYearFilter] = useState('All Start Years');
  const [endYearFilter, setEndYearFilter] = useState('All End Years');
  const [studentIdFilter, setStudentIdFilter] = useState('');
  const [studentNameFilter, setStudentNameFilter] = useState('');
  const [classFilter, setClassFilter] = useState('All Classes');

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
    setFooterYear(new Date().getFullYear());
    const checkAuthAndRedirect = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push('/login');
      } else {
        setIsAuthLoading(false);
      }
    };
    checkAuthAndRedirect();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleLoadStudentData = async () => {
    setIsLoadingData(true);
    const { data: students, error } = await supabase
      .from('student_details')
      .select('student_id, name, faculty, class, academic_year');

    if (error) {
      toast({ title: "Error Loading Students", description: error.message, variant: "destructive" });
      setAllStudents([]);
    } else if (students) {
      const formattedStudents: StudentRowData[] = students.map(s => ({
        id: s.student_id,
        name: s.name,
        academicYear: s.academic_year,
        studentClass: s.class,
        faculty: s.faculty,
      }));
      setAllStudents(formattedStudents);
    } else {
      setAllStudents([]);
      toast({ title: "No Students Found", description: "No student records were returned from the database." });
    }
    setIsLoadingData(false);
  };

  useEffect(() => {
    let filtered = allStudents;

    if (academicYearFilter !== 'All Academic Years') {
      filtered = filtered.filter(student => student.academicYear === academicYearFilter);
    }
     if (startYearFilter !== 'All Start Years') {
      filtered = filtered.filter(student => student.academicYear?.startsWith(startYearFilter));
    }
    if (endYearFilter !== 'All End Years') {
      filtered = filtered.filter(student => student.academicYear?.endsWith(endYearFilter));
    }
    if (studentIdFilter) {
      filtered = filtered.filter(student => student.id.toLowerCase().includes(studentIdFilter.toLowerCase()));
    }
    if (studentNameFilter) {
      filtered = filtered.filter(student => student.name.toLowerCase().includes(studentNameFilter.toLowerCase()));
    }
    if (classFilter !== 'All Classes') {
      filtered = filtered.filter(student => student.studentClass === classFilter);
    }

    setDisplayedStudents(filtered);
    setCurrentPage(1);
  }, [allStudents, academicYearFilter, startYearFilter, endYearFilter, studentIdFilter, studentNameFilter, classFilter]);


  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return displayedStudents.slice(startIndex, startIndex + entriesPerPage);
  }, [displayedStudents, currentPage, entriesPerPage]);

  const totalPages = Math.ceil(displayedStudents.length / entriesPerPage);

  const handleViewMarksheet = (student: StudentRowData) => {
    router.push(`/marksheet/view/${student.id}`);
  };

  const handleEditStudent = (student: StudentRowData) => {
    router.push(`/marksheet/edit/${student.id}`);
  };

  const handleDeleteStudent = async (student: StudentRowData) => {
    toast({
      title: 'Confirm Deletion',
      description: `Are you sure you want to delete ${student.name} (ID: ${student.id})? This action cannot be undone. (Deletion not implemented yet)`,
      variant: 'destructive'
    });
    console.log("Attempting to delete student (not implemented):", student);
  };

  const handleExportToExcel = async () => {
    if (displayedStudents.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no students currently displayed to export.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    toast({ title: "Exporting Data", description: "Fetching student details and marks, please wait..." });

    const studentDetailsData = [];
    const studentMarksData = [];

    try {
      for (const student of displayedStudents) {
        const { data: studentDetails, error: studentError } = await supabase
          .from('student_details')
          .select('*')
          .eq('student_id', student.id)
          .single();

        if (studentError) {
          console.error(`Error fetching details for student ${student.id}:`, studentError);
          continue;
        }

        studentDetailsData.push({
          "Student ID": studentDetails.student_id,
          "Student Name": studentDetails.name,
          "Father Name": studentDetails.father_name,
          "Mother Name": studentDetails.mother_name,
          "Date of Birth": studentDetails.dob ? format(parseISO(studentDetails.dob), 'dd-MM-yyyy') : '',
          "Gender": studentDetails.gender,
          "Faculty": studentDetails.faculty,
          "Class": studentDetails.class,
          "Section": studentDetails.section,
          "Academic Session": studentDetails.academic_year,
        });

        const { data: marksDetails, error: marksError } = await supabase
          .from('student_marks_details')
          .select('*')
          .eq('student_id', student.id);

        if (marksError) {
          console.error(`Error fetching marks for student ${student.id}:`, marksError);
        }

        if (marksDetails && marksDetails.length > 0) {
          for (const mark of marksDetails) {
            studentMarksData.push({
              "Student ID": studentDetails.student_id,
              "Student Name": studentDetails.name,
              "Subject Name": mark.subject_name,
              "Subject Category": mark.category,
              "Max Marks": mark.max_marks,
              "Pass Marks": mark.pass_marks,
              "Theory Marks Obtained": mark.theory_marks_obtained,
              "Practical Marks Obtained": mark.practical_marks_obtained,
              "Obtained Total Marks": mark.obtained_total_marks,
            });
          }
        } else {
           studentMarksData.push({
              "Student ID": studentDetails.student_id,
              "Student Name": studentDetails.name,
              "Subject Name": "N/A",
              "Subject Category": "N/A",
              "Max Marks": "N/A",
              "Pass Marks": "N/A",
              "Theory Marks Obtained": "N/A",
              "Practical Marks Obtained": "N/A",
              "Obtained Total Marks": "N/A",
            });
        }
      }

      if (studentDetailsData.length === 0 && studentMarksData.length === 0) {
        toast({ title: "No Detailed Data", description: "Could not fetch detailed data for the selected students.", variant: "destructive"});
        setIsExporting(false);
        return;
      }

      const workbook = XLSX.utils.book_new();

      if (studentDetailsData.length > 0) {
        const wsStudentDetails = XLSX.utils.json_to_sheet(studentDetailsData);
        const columnWidthsDetails = Object.keys(studentDetailsData[0] || {}).map(key => ({
          wch: Math.max(key.length, ...studentDetailsData.map(row => String(row[key as keyof typeof row] ?? '').length)) + 2
        }));
        if (columnWidthsDetails.length > 0) wsStudentDetails["!cols"] = columnWidthsDetails;
        XLSX.utils.book_append_sheet(workbook, wsStudentDetails, "Student Details");
      }


      if (studentMarksData.length > 0) {
        const wsStudentMarks = XLSX.utils.json_to_sheet(studentMarksData);
         const columnWidthsMarks = Object.keys(studentMarksData[0] || {}).map(key => ({
          wch: Math.max(key.length, ...studentMarksData.map(row => String(row[key as keyof typeof row] ?? '').length)) + 2
        }));
        if (columnWidthsMarks.length > 0) wsStudentMarks["!cols"] = columnWidthsMarks;
        XLSX.utils.book_append_sheet(workbook, wsStudentMarks, "Student Marks Details");
      }


      XLSX.writeFile(workbook, "students_and_marks_export.xlsx");
      toast({
        title: "Export Successful",
        description: "Student details and marks exported to students_and_marks_export.xlsx",
      });
    } catch (error: any) {
      console.error("Error during Excel export:", error);
      toast({ title: "Export Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const parseExcelDate = (excelDate: any): string | null => {
    if (typeof excelDate === 'number') {
      const date = XLSX.SSF.parse_date_code(excelDate);
      if (date) {
        // Pad month and day with leading zeros if necessary
        const month = String(date.m).padStart(2, '0');
        const day = String(date.d).padStart(2, '0');
        return `${date.y}-${month}-${day}`; // Format as YYYY-MM-DD
      }
    } else if (typeof excelDate === 'string') {
      // Try parsing common string date formats
      const formatsToTry = ["yyyy-MM-dd", "dd-MM-yyyy", "MM/dd/yyyy", "dd/MM/yyyy"];
      for (const fmt of formatsToTry) {
        try {
          const parsedDate = parse(excelDate, fmt, new Date());
          if (isValid(parsedDate)) {
            return format(parsedDate, 'yyyy-MM-dd');
          }
        } catch (e) {/* ignore parse error and try next format */}
      }
      // If it's already in ISO format from a previous parse or direct input
      if (isValid(parseISO(excelDate))) {
        return format(parseISO(excelDate), 'yyyy-MM-dd');
      }
    }
    return null; // Return null if parsing fails
  };


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    toast({ title: "Importing Data", description: "Processing Excel file, please wait..." });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        if (!data) {
          toast({ title: "File Read Error", description: "Could not read the file content.", variant: "destructive" });
          setIsImporting(false);
          return;
        }

        const workbook = XLSX.read(data, { type: 'array', cellDates: false }); // cellDates: false to handle dates manually

        // --- Process Student Details ---
        const studentDetailsSheetName = 'Student Details';
        const studentDetailsSheet = workbook.Sheets[studentDetailsSheetName];
        if (!studentDetailsSheet) {
          toast({ title: "Import Error", description: `Sheet "${studentDetailsSheetName}" not found.`, variant: "destructive" });
          setIsImporting(false);
          return;
        }
        const studentDetailsJson = XLSX.utils.sheet_to_json<any>(studentDetailsSheet, { raw: false, defval: null });

        let importedStudentsCount = 0;
        const studentInserts = [];

        for (const row of studentDetailsJson) {
          const rollNumber = String(row['Roll Number'] || '').trim();
          const studentName = String(row['Student Name'] || '').trim();
          const fatherName = String(row['Father Name'] || '').trim();
          const motherName = String(row['Mother Name'] || '').trim();
          const dobRaw = row['Date of Birth'];
          const gender = String(row['Gender'] || '').trim();
          const faculty = String(row['Faculty'] || '').trim();
          const studentClass = String(row['Class'] || '').trim(); // 'Class' from Excel, maps to db 'class'
          const section = String(row['Section'] || '').trim();
          const academicSession = String(row['Academic Session'] || '').trim();

          if (!rollNumber || !studentName || !fatherName || !motherName || !dobRaw || !gender || !faculty || !studentClass || !section || !academicSession) {
            console.warn("Skipping row due to missing required student details:", row);
            continue;
          }
          
          const dobFormatted = parseExcelDate(dobRaw);
          if (!dobFormatted) {
            console.warn(`Skipping student ${studentName} due to invalid date of birth: ${dobRaw}`);
            continue;
          }

          const academicYearParts = academicSession.split('-');
          if (academicYearParts.length !== 2 || !/^\d{4}$/.test(academicYearParts[0]) || !/^\d{4}$/.test(academicYearParts[1])) {
             console.warn(`Skipping student ${studentName} due to invalid academic session format: ${academicSession}`);
             continue;
          }

          studentInserts.push({
            student_id: rollNumber,
            roll_no: rollNumber,
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
        }
        
        if (studentInserts.length > 0) {
          const { error: studentInsertError, count: insertedCount } = await supabase
            .from('student_details')
            .insert(studentInserts, { upsert: true }); // Use upsert to update if student_id exists

          if (studentInsertError) {
            toast({ title: "Student Import Error", description: `Failed to import some student details: ${studentInsertError.message}. Some data might be partially imported.`, variant: "destructive" });
          }
          importedStudentsCount = insertedCount || 0;
        }


        // --- Process Student Marks Details ---
        const studentMarksSheetName = 'Student Marks Details';
        const studentMarksSheet = workbook.Sheets[studentMarksSheetName];
        if (!studentMarksSheet) {
          toast({ title: "Import Error", description: `Sheet "${studentMarksSheetName}" not found. Student details might have been imported.`, variant: "destructive" });
          setIsImporting(false);
          return;
        }
        const studentMarksJson = XLSX.utils.sheet_to_json<any>(studentMarksSheet, { raw: false, defval: null });
        
        let importedMarksCount = 0;
        const marksInserts = [];

        for (const row of studentMarksJson) {
          const rollNumber = String(row['Roll Number'] || '').trim();
          const subjectName = String(row['Subject Name'] || '').trim();
          const subjectCategory = String(row['Subject Category'] || '').trim();
          const maxMarks = parseFloat(String(row['Max Marks'] || '0'));
          const passMarks = parseFloat(String(row['Pass Marks'] || '0'));
          const theoryMarks = parseFloat(String(row['Theory Marks Obtained'] || '0'));
          const practicalMarks = parseFloat(String(row['Practical Marks Obtained'] || '0'));

          if (!rollNumber || !subjectName || !subjectCategory || isNaN(maxMarks) || isNaN(passMarks) ) {
            console.warn("Skipping row due to missing required marks details or invalid numbers:", row);
            continue;
          }
          
          const obtainedTotalMarks = (isNaN(theoryMarks) ? 0 : theoryMarks) + (isNaN(practicalMarks) ? 0 : practicalMarks);

          marksInserts.push({
            student_id: rollNumber,
            subject_name: subjectName,
            category: subjectCategory,
            max_marks: maxMarks,
            pass_marks: passMarks,
            theory_marks_obtained: isNaN(theoryMarks) ? 0 : theoryMarks,
            practical_marks_obtained: isNaN(practicalMarks) ? 0 : practicalMarks,
            obtained_total_marks: obtainedTotalMarks,
          });
        }

        if (marksInserts.length > 0) {
           // For marks, it's safer to delete existing marks for these students and re-insert
           // to avoid duplicates if the import is run multiple times.
           const uniqueStudentIdsForMarks = [...new Set(marksInserts.map(m => m.student_id))];
           if (uniqueStudentIdsForMarks.length > 0) {
             await supabase.from('student_marks_details').delete().in('student_id', uniqueStudentIdsForMarks);
           }

          const { error: marksInsertError, count: insertedMarks } = await supabase
            .from('student_marks_details')
            .insert(marksInserts);

          if (marksInsertError) {
            toast({ title: "Marks Import Error", description: `Failed to import some marks: ${marksInsertError.message}. Student details might have been imported.`, variant: "destructive" });
          }
          importedMarksCount = insertedMarks || 0;
        }
        
        toast({
          title: "Import Complete",
          description: `Successfully processed file. Imported/Updated ${importedStudentsCount} student(s) and ${importedMarksCount} marks record(s). Refresh data to see changes.`,
        });
        await handleLoadStudentData(); // Refresh the dashboard

      };
      reader.onerror = () => {
        toast({ title: "File Read Error", description: "Could not read the file.", variant: "destructive" });
        setIsImporting(false);
      };
      reader.readAsArrayBuffer(file);

    } catch (error: any) {
      console.error("Error during Excel import:", error);
      toast({ title: "Import Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
    }
  };


  if (!isClient || isAuthLoading) {
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
        pageSubtitle={dashboardSubtitle}
      />

      <main className="flex-grow container mx-auto px-4 py-6 sm:px-6 lg:px-8">
       <div className="bg-primary text-primary-foreground p-3 rounded-md shadow-md mb-6">
          <div className="container mx-auto px-0 sm:px-0 lg:px-0"> {/* Ensure this inner container also has no extra padding */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <h2 className="text-xl font-semibold">STUDENT DETAILS</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={handleLoadStudentData}
                  disabled={isLoadingData || isImporting}
                >
                  {isLoadingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Load Student Data
                </Button>
                <Link href="/marksheet/new" passHref>
                  <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground"  disabled={isImporting}>
                    <FilePlus2 className="mr-2 h-4 w-4" /> Create New
                  </Button>
                </Link>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".xlsx, .xls"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary-foreground hover:bg-accent hover:text-accent-foreground" 
                  onClick={triggerFileInput}
                  disabled={isImporting}
                >
                  {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Import Data
                </Button>
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground" onClick={handleExportToExcel} disabled={isExporting || isImporting}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Export to Excel
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Card className="mb-6 shadow-md">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
              <div>
                <Label htmlFor="academicYear">Academic Session</Label>
                <Select value={academicYearFilter} onValueChange={setAcademicYearFilter} disabled={isImporting}>
                  <SelectTrigger id="academicYear"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startYear">Start Year</Label>
                <Select value={startYearFilter} onValueChange={setStartYearFilter} disabled={isImporting}>
                  <SelectTrigger id="startYear"><SelectValue placeholder="Start Year" /></SelectTrigger>
                  <SelectContent>
                    {START_YEARS.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="endYear">End Year</Label>
                <Select value={endYearFilter} onValueChange={setEndYearFilter} disabled={isImporting}>
                  <SelectTrigger id="endYear"><SelectValue placeholder="End Year" /></SelectTrigger>
                  <SelectContent>
                    {END_YEARS.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="studentCollegeId">Student College Id</Label>
                <Input id="studentCollegeId" placeholder="Student Id" value={studentIdFilter} onChange={e => setStudentIdFilter(e.target.value)} disabled={isImporting} />
              </div>
              <div>
                <Label htmlFor="studentName">Student Name</Label>
                <Input id="studentName" placeholder="Student Name" value={studentNameFilter} onChange={e => setStudentNameFilter(e.target.value)} disabled={isImporting}/>
              </div>
              <div>
                <Label htmlFor="class">Class</Label>
                <Select value={classFilter} onValueChange={setClassFilter} disabled={isImporting}>
                  <SelectTrigger id="class"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLASSES.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center gap-2">
            <Label htmlFor="showEntries" className="text-sm whitespace-nowrap">Show</Label>
            <Select value={String(entriesPerPage)} onValueChange={(value) => { setEntriesPerPage(Number(value)); setCurrentPage(1); }} disabled={isImporting}>
              <SelectTrigger id="showEntries" className="w-20 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50].map(num => <SelectItem key={num} value={String(num)}>{num}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">entries</span>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-primary text-primary-foreground">
                  <TableRow>
                    <TableHead className="text-white">Student Id</TableHead>
                    <TableHead className="text-white">Student Name</TableHead>
                    <TableHead className="text-white">Academic Year</TableHead>
                    <TableHead className="text-white">Class</TableHead>
                    <TableHead className="text-white">Faculty</TableHead>
                    <TableHead className="text-white text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.length > 0 ? paginatedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.id}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.academicYear}</TableCell>
                      <TableCell>{student.studentClass}</TableCell>
                      <TableCell>{student.faculty}</TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"  disabled={isImporting}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewMarksheet(student)} disabled={isImporting}>View Marksheet</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditStudent(student)} disabled={isImporting}>Edit Student</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteStudent(student)} className="text-destructive focus:bg-destructive/10 focus:text-destructive" disabled={isImporting}>Delete Student</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {allStudents.length === 0 && !isLoadingData && !isAuthLoading && !isImporting ? 'Click "Load Student Data" above to view student records, or "Import Data".' :
                          isLoadingData ? 'Loading student data...' :
                          isImporting ? 'Importing data, please wait...' :
                            (allStudents.length > 0 && displayedStudents.length === 0) ? 'No students found matching your filters.' :
                              'No student data available. Try loading or adding students.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-2">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              Showing {paginatedStudents.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0} to {Math.min(currentPage * entriesPerPage, displayedStudents.length)} of {displayedStudents.length} entries
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isImporting}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0 || isImporting}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>

      <footer className="py-4 border-t border-border mt-auto print:hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground">
          <p className="mb-2 sm:mb-0 text-center sm:text-left">Copyright ©{footerYear || new Date().getFullYear()} by Saryug College, Samastipur, Bihar.</p>
          <p className="text-center sm:text-right">Design By Mantix.</p>
        </div>
      </footer>
    </div>
  );
}
