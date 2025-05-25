
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  RefreshCw,
  FilePlus2,
  Download,
  Upload,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import type { StudentRowData } from '@/types';
import { useLoadingIndicator } from '@/components/app/navigation-loader';


const dashboardPageTitle = "SARYUG COLLEGE";
const dashboardPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoadingIndicator();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  const [allStudents, setAllStudents] = useState<StudentRowData[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  const [dynamicAcademicYearOptions, setDynamicAcademicYearOptions] = useState<string[]>(['All Academic Years']);
  const [dynamicStartYearOptions, setDynamicStartYearOptions] = useState<string[]>(['All Start Years']);
  const [dynamicEndYearOptions, setDynamicEndYearOptions] = useState<string[]>(['All End Years']);
  const [dynamicClassOptions, setDynamicClassOptions] = useState<string[]>(['All Classes']);

  const [academicYearFilter, setAcademicYearFilter] = useState('All Academic Years');
  const [startYearFilter, setStartYearFilter] = useState('All Start Years');
  const [endYearFilter, setEndYearFilter] = useState('All End Years');
  const [studentRollNoFilter, setStudentRollNoFilter] = useState('');
  const [studentNameFilter, setStudentNameFilter] = useState('');
  const [classFilter, setClassFilter] = useState('All Classes');

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  useEffect(() => {
    setFooterYear(new Date().getFullYear());
    const checkAuthAndRedirect = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          setAuthStatus('unauthenticated');
        } else {
          setAuthStatus('authenticated');
        }
      } catch (e) {
        console.error("Auth check error:", e);
        setAuthStatus('unauthenticated');
      }
    };
    checkAuthAndRedirect();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setAuthStatus('unauthenticated');
      } else if (event === 'SIGNED_IN') {
        setAuthStatus('authenticated');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

 useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
      hideLoader();
    } else if (authStatus === 'authenticated') {
      // Data is not auto-loaded here anymore; user must click "Load Student Data"
      // Ensure loader is hidden if it was shown by navigation
      hideLoader();
    }
    // Do not hide loader if authStatus is 'loading', as NavigationEventsManager might have shown it
    // and we are waiting for auth check to complete.
  }, [authStatus, router, hideLoader]);


  const populateDynamicFilterOptions = (students: StudentRowData[]) => {
    if (!students || students.length === 0) {
      setDynamicAcademicYearOptions(['All Academic Years']);
      setDynamicStartYearOptions(['All Start Years']);
      setDynamicEndYearOptions(['All End Years']);
      setDynamicClassOptions(['All Classes']);
      return;
    }

    const academicYears = [...new Set(students.map(s => s.academicYear).filter(Boolean) as string[])].sort();
    setDynamicAcademicYearOptions(['All Academic Years', ...academicYears]);

    const startYears = [...new Set(students.map(s => s.academicYear?.split('-')[0]).filter(Boolean) as string[])].sort((a, b) => parseInt(b) - parseInt(a));
    setDynamicStartYearOptions(['All Start Years', ...startYears]);

    const endYears = [...new Set(students.map(s => s.academicYear?.split('-')[1]).filter(Boolean) as string[])].sort((a, b) => parseInt(b) - parseInt(a));
    setDynamicEndYearOptions(['All End Years', ...endYears]);

    const classes = [...new Set(students.map(s => s.class).filter(Boolean) as string[])].sort();
    setDynamicClassOptions(['All Classes', ...classes]);
  };

  const handleLoadStudentData = async () => {
    setIsLoadingData(true);
    showLoader();
    setSelectedStudents(new Set()); // Clear selection when reloading data
    try {
      const { data: studentsData, error } = await supabase
        .from('student_details')
        .select('id, roll_no, name, faculty, class, academic_year, registration_no');

      if (error) {
        throw error;
      }

      if (studentsData) {
        const formattedStudents: StudentRowData[] = studentsData.map(s => ({
          system_id: s.id,
          roll_no: s.roll_no,
          name: s.name,
          academicYear: s.academic_year,
          class: s.class,
          faculty: s.faculty,
          registrationNo: s.registration_no,
        }));
        setAllStudents(formattedStudents);
        populateDynamicFilterOptions(formattedStudents);
        toast({ title: "Student Data Loaded", description: `${formattedStudents.length} records fetched.` });
      } else {
        setAllStudents([]);
        populateDynamicFilterOptions([]);
        toast({ title: "No Students Found", description: "No student records were returned from the database." });
      }
    } catch (error: any) {
      toast({ title: "Error Loading Students", description: error.message || "Could not fetch student data.", variant: "destructive" });
      setAllStudents([]);
      populateDynamicFilterOptions([]);
    } finally {
      setIsLoadingData(false);
      hideLoader();
    }
  };

  const displayedStudents = useMemo(() => {
    let filtered = allStudents;

    if (academicYearFilter !== 'All Academic Years') {
      filtered = filtered.filter(student => student.academicYear === academicYearFilter);
    }

    const filterStartYearNum = startYearFilter !== 'All Start Years' ? parseInt(startYearFilter, 10) : null;
    const filterEndYearNum = endYearFilter !== 'All End Years' ? parseInt(endYearFilter, 10) : null;

    if (filterStartYearNum !== null || filterEndYearNum !== null) {
      filtered = filtered.filter(student => {
        if (!student.academicYear || !student.academicYear.includes('-')) {
          return false;
        }
        const [studentSessionStartStr, studentSessionEndStr] = student.academicYear.split('-');
        const studentSessionStartYear = parseInt(studentSessionStartStr, 10);
        const studentSessionEndYear = parseInt(studentSessionEndStr, 10);

        if (isNaN(studentSessionStartYear) || isNaN(studentSessionEndYear)) {
          return false;
        }

        let include = true;
        if (filterStartYearNum !== null) {
          if (studentSessionEndYear < filterStartYearNum) { 
            include = false;
          }
        }
        if (filterEndYearNum !== null) {
          if (studentSessionStartYear > filterEndYearNum) { 
            include = false;
          }
        }
        return include;
      });
    }

    if (studentRollNoFilter) { 
      filtered = filtered.filter(student => student.roll_no && student.roll_no.toLowerCase().includes(studentRollNoFilter.toLowerCase()));
    }
    if (studentNameFilter) {
      filtered = filtered.filter(student => student.name && student.name.toLowerCase().includes(studentNameFilter.toLowerCase()));
    }
    if (classFilter !== 'All Classes') {
      filtered = filtered.filter(student => student.class === classFilter);
    }
    return filtered;
  }, [allStudents, academicYearFilter, startYearFilter, endYearFilter, studentRollNoFilter, studentNameFilter, classFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [displayedStudents]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return displayedStudents.slice(startIndex, startIndex + entriesPerPage);
  }, [displayedStudents, currentPage, entriesPerPage]);

  const totalPages = Math.ceil(displayedStudents.length / entriesPerPage);

  const handleViewMarksheet = (student: StudentRowData) => {
    router.push(`/marksheet/view/${student.system_id}`);
  };

  const handleEditStudent = (student: StudentRowData) => {
    router.push(`/marksheet/edit/${student.system_id}`);
  };

  const handleDeleteStudent = async (student: StudentRowData) => {
    if (!confirm(`Are you sure you want to delete student ${student.name} (Roll No: ${student.roll_no}) and all their marks? This action cannot be undone.`)) {
      return;
    }
    showLoader();
    setIsDeletingSelected(true); // Use general deleting state
    try {
      const { error: marksError } = await supabase
        .from('student_marks_details')
        .delete()
        .eq('student_detail_id', student.system_id);

      if (marksError) {
        throw new Error(`Could not delete marks for ${student.name}: ${marksError.message}`);
      }

      const { error: studentError } = await supabase
        .from('student_details')
        .delete()
        .eq('id', student.system_id);

      if (studentError) {
        throw new Error(`Could not delete student ${student.name}: ${studentError.message}. Their marks might have been deleted.`);
      }

      toast({
        title: 'Student Deleted',
        description: `${student.name} (Roll No: ${student.roll_no}) and their marks have been deleted.`,
      });

      // Refresh data and clear selection
      const newSelected = new Set(selectedStudents);
      newSelected.delete(student.system_id);
      setSelectedStudents(newSelected);
      await handleLoadStudentData(); 
      
    } catch (error: any) {
      toast({
        title: 'Deletion Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingSelected(false);
      hideLoader();
    }
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
    showLoader();
    toast({ title: "Exporting Data", description: "Fetching student details and marks, please wait..." });

    const studentDetailsSheetData: any[] = [];
    const studentMarksDataSheet: any[] = [];

    const studentDetailHeaders = ["System ID", "Roll No", "Registration No", "Name", "Father Name", "Mother Name", "Date of Birth", "Gender", "Faculty", "Class", "Academic Session"];
    const studentMarkHeaders = ["System ID", "Roll No", "Name", "Subject Name", "Subject Category", "Max Marks", "Pass Marks", "Theory Marks Obtained", "Practical Marks Obtained", "Obtained Total Marks"];

    try {
      for (const displayedStudent of displayedStudents) {
        // Fetch full details for each student to ensure all columns are populated
        const { data: studentDetails, error: studentError } = await supabase
          .from('student_details')
          .select('*')
          .eq('id', displayedStudent.system_id)
          .single();

        if (studentError || !studentDetails) {
          console.error(`Error fetching details for student ${displayedStudent.system_id}:`, studentError);
          // Add a placeholder row if details can't be fetched
          studentDetailsSheetData.push({
            "System ID": displayedStudent.system_id,
            "Roll No": displayedStudent.roll_no,
            "Registration No": displayedStudent.registrationNo || 'N/A',
            "Name": displayedStudent.name,
            "Father Name": "Error fetching", // Placeholder
            "Mother Name": "Error fetching",
            "Date of Birth": "Error fetching",
            "Gender": "Error fetching",
            "Faculty": "Error fetching",
            "Class": "Error fetching",
            "Academic Session": "Error fetching",
          });
          continue; // Skip marks for this student if details are missing
        }

        studentDetailsSheetData.push({
          "System ID": studentDetails.id,
          "Roll No": studentDetails.roll_no,
          "Registration No": studentDetails.registration_no || '',
          "Name": studentDetails.name,
          "Father Name": studentDetails.father_name,
          "Mother Name": studentDetails.mother_name,
          "Date of Birth": studentDetails.dob ? format(parseISO(studentDetails.dob), 'dd-MM-yyyy') : '',
          "Gender": studentDetails.gender,
          "Faculty": studentDetails.faculty,
          "Class": studentDetails.class,
          "Academic Session": studentDetails.academic_year,
        });

        // Fetch marks for this student
        const { data: marksDetails, error: marksError } = await supabase
          .from('student_marks_details')
          .select('*')
          .eq('student_detail_id', studentDetails.id);

        if (marksError) {
          console.error(`Error fetching marks for student ${studentDetails.id}:`, marksError);
          // Optionally, add a placeholder for marks if fetching fails
        }

        if (marksDetails && marksDetails.length > 0) {
          for (const mark of marksDetails) {
            studentMarksDataSheet.push({
              "System ID": studentDetails.id, // Use the system_id from studentDetails for consistency
              "Roll No": studentDetails.roll_no,
              "Name": studentDetails.name,
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
            // Add a row indicating no marks if applicable, or skip
             studentMarksDataSheet.push({
              "System ID": studentDetails.id,
              "Roll No": studentDetails.roll_no,
              "Name": studentDetails.name,
              "Subject Name": "N/A", "Subject Category": "N/A", "Max Marks": "N/A", "Pass Marks": "N/A",
              "Theory Marks Obtained": "N/A", "Practical Marks Obtained": "N/A", "Obtained Total Marks": "N/A",
            });
        }
      }

      if (studentDetailsSheetData.length === 0 && studentMarksDataSheet.length === 0) {
        toast({ title: "No Detailed Data", description: "Could not fetch detailed data for the selected students.", variant: "destructive" });
        setIsExporting(false);
        hideLoader();
        return;
      }

      const workbook = XLSX.utils.book_new();

      // Create Student Details Sheet
      if (studentDetailsSheetData.length > 0) {
        const wsStudentDetails = XLSX.utils.json_to_sheet(studentDetailsSheetData, { header: studentDetailHeaders, skipHeader: false });
        XLSX.utils.book_append_sheet(workbook, wsStudentDetails, "Student Details");
      }

      // Create Student Marks Details Sheet
      if (studentMarksDataSheet.length > 0) {
        const wsStudentMarks = XLSX.utils.json_to_sheet(studentMarksDataSheet, { header: studentMarkHeaders, skipHeader: false });
        XLSX.utils.book_append_sheet(workbook, wsStudentMarks, "Student Marks Details");
      }
      
      // Auto-size columns for all sheets
      Object.keys(workbook.Sheets).forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet['!cols']) sheet['!cols'] = [];
        const jsonSheet = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
        if (jsonSheet.length > 0) {
          const cols = jsonSheet[0] as any[]; // Get headers
          if (cols) {
            const colWidths = cols.map((_, i) => {
              let maxLen = String(cols[i] || '').length; // Header length
              jsonSheet.forEach((row: any) => { // Iterate over all rows
                const cellValue = row[i];
                if (cellValue != null) { // Check if cell is not empty
                  const len = String(cellValue).length;
                  if (len > maxLen) maxLen = len;
                }
              });
              return { wch: maxLen + 2 }; // Add a little padding
            });
            sheet['!cols'] = colWidths;
          }
        }
      });


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
      hideLoader();
    }
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement> | boolean) => {
    const isChecked = typeof event === 'boolean' ? event : event.target.checked;
    if (isChecked) {
      const newSelected = new Set(paginatedStudents.map(student => student.system_id));
      setSelectedStudents(newSelected);
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleRowSelectClick = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const numSelectedOnPage = paginatedStudents.filter(s => selectedStudents.has(s.system_id)).length;
  const isAllSelectedOnPage = paginatedStudents.length > 0 && numSelectedOnPage === paginatedStudents.length;


  const handleDeleteSelectedStudents = async () => {
    if (selectedStudents.size === 0) {
      toast({ title: "No Students Selected", description: "Please select students to delete.", variant: "destructive" });
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedStudents.size} selected student(s) and all their marks? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingSelected(true);
    showLoader();
    let deletedCount = 0;
    let errorCount = 0;

    for (const studentSystemId of selectedStudents) {
      try {
        // First, delete associated marks
        const { error: marksError } = await supabase
          .from('student_marks_details')
          .delete()
          .eq('student_detail_id', studentSystemId);

        if (marksError) {
          // Log the error but attempt to delete the student anyway, or handle as per your policy
          console.error(`Failed to delete marks for student ID ${studentSystemId.substring(0,8)}...: ${marksError.message}`);
          // Decide if this should stop the student deletion. For now, we'll proceed.
        }

        // Then, delete the student
        const { error: studentError } = await supabase
          .from('student_details')
          .delete()
          .eq('id', studentSystemId);

        if (studentError) {
          throw new Error(`Failed to delete student ID ${studentSystemId.substring(0,8)}...: ${studentError.message}`);
        }
        deletedCount++;
      } catch (error: any) {
        console.error(error);
        toast({ title: "Deletion Error", description: error.message, variant: "destructive" });
        errorCount++;
      }
    }

    if (deletedCount > 0) {
      toast({ title: "Deletion Successful", description: `${deletedCount} student(s) deleted.` });
    }
    if (errorCount > 0) {
      toast({ title: "Deletion Partially Failed", description: `${errorCount} student(s) could not be deleted or their marks could not be fully cleared. Check console for details.`, variant: "destructive" });
    }

    // Refresh data and clear selection
    setSelectedStudents(new Set());
    await handleLoadStudentData(); 
    
    setIsDeletingSelected(false);
    hideLoader();
  };


  if (authStatus === 'loading') {
    // The global loader from LoadingProvider should be active here if shown by NavigationEventsManager
    // This can be a fallback or removed if the global loader is sufficient.
    // For now, let's keep it to ensure some feedback if global loader somehow isn't visible.
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader
        pageTitle={dashboardPageTitle}
        pageSubtitle={dashboardPageSubtitle}
      />

      <main className="flex-grow container mx-auto px-4 py-6 sm:px-6 lg:px-8 max-w-screen-xl">
        <div className="bg-primary text-primary-foreground p-3 rounded-md shadow-md mb-6">
          <div className="container mx-auto px-0 sm:px-0 lg:px-0">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <h2 className="text-xl font-semibold">STUDENT DETAILS</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={handleLoadStudentData}
                  disabled={isLoadingData || isDeletingSelected}
                >
                  {isLoadingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Load Student Data
                </Button>
                <Link href="/marksheet/new" passHref>
                  <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground" disabled={isDeletingSelected}>
                    <FilePlus2 className="mr-2 h-4 w-4" /> Create New
                  </Button>
                </Link>
                <Link href="/import" passHref>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-foreground hover:bg-accent hover:text-accent-foreground"
                    disabled={isDeletingSelected}
                  >
                    <Download className="mr-2 h-4 w-4" /> Import Data
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground" onClick={handleExportToExcel} disabled={isExporting || isDeletingSelected || allStudents.length === 0}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Export to Excel
                </Button>
                 {selectedStudents.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelectedStudents}
                    disabled={isDeletingSelected || isLoadingData}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isDeletingSelected ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete Selected ({selectedStudents.size})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Card className="mb-6 shadow-md">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
              <div>
                <Label htmlFor="academicYear">Academic Session</Label>
                <Select value={academicYearFilter} onValueChange={setAcademicYearFilter} disabled={isDeletingSelected}>
                  <SelectTrigger id="academicYear"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dynamicAcademicYearOptions.map(year => <SelectItem key={year} value={year} disabled={year === 'All Academic Years' && dynamicAcademicYearOptions.length === 1}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startYear">Start Year</Label>
                <Select value={startYearFilter} onValueChange={setStartYearFilter} disabled={isDeletingSelected}>
                  <SelectTrigger id="startYear"><SelectValue placeholder="Start Year" /></SelectTrigger>
                  <SelectContent>
                    {dynamicStartYearOptions.map(year => <SelectItem key={year} value={year} disabled={year === 'All Start Years' && dynamicStartYearOptions.length === 1}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="endYear">End Year</Label>
                <Select value={endYearFilter} onValueChange={setEndYearFilter} disabled={isDeletingSelected}>
                  <SelectTrigger id="endYear"><SelectValue placeholder="End Year" /></SelectTrigger>
                  <SelectContent>
                    {dynamicEndYearOptions.map(year => <SelectItem key={year} value={year} disabled={year === 'All End Years' && dynamicEndYearOptions.length === 1}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="studentRollNo">Student Roll No</Label>
                <Input id="studentRollNo" placeholder="Roll No" value={studentRollNoFilter} onChange={e => setStudentRollNoFilter(e.target.value)} disabled={isDeletingSelected} />
              </div>
              <div>
                <Label htmlFor="studentName">Student Name</Label>
                <Input id="studentName" placeholder="Student Name" value={studentNameFilter} onChange={e => setStudentNameFilter(e.target.value)} disabled={isDeletingSelected} />
              </div>
              <div>
                <Label htmlFor="class">Class</Label>
                <Select value={classFilter} onValueChange={setClassFilter} disabled={isDeletingSelected}>
                  <SelectTrigger id="class"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dynamicClassOptions.map(cls => <SelectItem key={cls} value={cls} disabled={cls === 'All Classes' && dynamicClassOptions.length === 1}>{cls}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center gap-2">
            <Label htmlFor="showEntries" className="text-sm whitespace-nowrap">Show</Label>
            <Select value={String(entriesPerPage)} onValueChange={(value) => { setEntriesPerPage(Number(value)); setCurrentPage(1); }} disabled={isDeletingSelected}>
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
                <TableHeader className="h-12 bg-primary text-primary-foreground">
                  <TableRow>
                    <TableHead className="text-white w-12 text-center">
                      <Checkbox
                        id="select-all-header"
                        checked={isAllSelectedOnPage}
                        onCheckedChange={handleSelectAllClick}
                        aria-label="Select all students on this page"
                        className="border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
                      />
                    </TableHead>
                    <TableHead className="text-white">Roll No</TableHead>
                    <TableHead className="text-white">Reg. No</TableHead>
                    <TableHead className="text-white">Student Name</TableHead>
                    <TableHead className="text-white">Academic Year</TableHead>
                    <TableHead className="text-white">Class</TableHead>
                    <TableHead className="text-white">Faculty</TableHead>
                    <TableHead className="text-white text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingData ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground mt-2">Loading student data...</p>
                      </TableCell>
                    </TableRow>
                  ) : paginatedStudents.length > 0 ? paginatedStudents.map((student) => (
                    <TableRow key={student.system_id} data-state={selectedStudents.has(student.system_id) ? "selected" : ""}>
                      <TableCell className="text-center">
                        <Checkbox
                          id={`select-student-${student.system_id}`}
                          checked={selectedStudents.has(student.system_id)}
                          onCheckedChange={() => handleRowSelectClick(student.system_id)}
                          aria-label={`Select student ${student.name}`}
                        />
                      </TableCell>
                      <TableCell>{student.roll_no}</TableCell>
                      <TableCell>{student.registrationNo}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.academicYear}</TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell>{student.faculty}</TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDeletingSelected}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewMarksheet(student)}>View Marksheet</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditStudent(student)}>Edit Student</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteStudent(student)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">Delete Student</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {allStudents.length === 0 && !isLoadingData ? 'Click "Load Student Data" above to view student records, or "Import Data".' :
                          (displayedStudents.length === 0) ? 'No students found matching your filters.' :
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
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isDeletingSelected}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0 || isDeletingSelected}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>

      <footer className="py-4 border-t border-border mt-auto print:hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground max-w-screen-xl">
          <p className="mb-2 sm:mb-0 text-center sm:text-left">Copyright ©{footerYear || new Date().getFullYear()} by Saryug College, Samastipur, Bihar.</p>
          <p className="text-center sm:text-right">Design By Mantix.</p>
        </div>
      </footer>
    </div>
  );
}

