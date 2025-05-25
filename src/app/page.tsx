
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Button, buttonVariants } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  RefreshCw,
  FilePlus2,
  Upload,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import type { StudentRowData } from '@/types';

const dashboardPageTitle = "SARYUG COLLEGE";
const dashboardPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

  const [studentsOnPage, setStudentsOnPage] = useState<StudentRowData[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentToDelete, setStudentToDelete] = useState<StudentRowData | null>(null);

  const [dynamicAcademicYearOptions, setDynamicAcademicYearOptions] = useState<string[]>(['All Academic Years']);
  const [dynamicClassOptions, setDynamicClassOptions] = useState<string[]>(['All Classes']);
  const [dynamicFacultyOptions, setDynamicFacultyOptions] = useState<string[]>(['All Faculties']);

  const [academicYearFilter, setAcademicYearFilter] = useState('All Academic Years');
  const [studentRollNoFilter, setStudentRollNoFilter] = useState('');
  const [studentNameFilter, setStudentNameFilter] = useState('');
  const [classFilter, setClassFilter] = useState('All Classes');
  const [facultyFilter, setFacultyFilter] = useState('All Faculties');

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  const [initialFiltersLoaded, setInitialFiltersLoaded] = useState(false);

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
    } else if (authStatus === 'authenticated' && !initialFiltersLoaded) {
      fetchDistinctFilterValues();
    }
  }, [authStatus, router, initialFiltersLoaded]);

  const fetchDistinctFilterValues = async () => {
    try {
      const [academicYearsRes, classesRes, facultiesRes] = await Promise.all([
        supabase.from('student_details').select('academic_year', { count: 'exact', head: false }).then(res => ({ ...res, data: [...new Set(res.data?.map(item => item.academic_year).filter(Boolean) as string[])].sort() })),
        supabase.from('student_details').select('class', { count: 'exact', head: false }).then(res => ({ ...res, data: [...new Set(res.data?.map(item => item.class).filter(Boolean) as string[])].sort() })),
        supabase.from('student_details').select('faculty', { count: 'exact', head: false }).then(res => ({ ...res, data: [...new Set(res.data?.map(item => item.faculty).filter(Boolean) as string[])].sort() })),
      ]);

      if (academicYearsRes.error) throw academicYearsRes.error;
      if (classesRes.error) throw classesRes.error;
      if (facultiesRes.error) throw facultiesRes.error;

      setDynamicAcademicYearOptions(['All Academic Years', ...academicYearsRes.data!]);
      setDynamicClassOptions(['All Classes', ...classesRes.data!]);
      setDynamicFacultyOptions(['All Faculties', ...facultiesRes.data!]);
      
      setInitialFiltersLoaded(true);
    } catch (error: any) {
      toast({ title: "Error Loading Filter Options", description: error.message || "Could not fetch distinct values for filters.", variant: "destructive" });
    }
  };
  
  const handleLoadStudentData = useCallback(async (pageToLoad = 1) => {
    setIsLoadingData(true);
    setSelectedStudents(new Set());
    setCurrentPage(pageToLoad);

    try {
      let query = supabase
        .from('student_details')
        .select('id, roll_no, name, faculty, class, academic_year, registration_no', { count: 'exact' });

      if (academicYearFilter !== 'All Academic Years') {
        query = query.eq('academic_year', academicYearFilter);
      }
      if (studentRollNoFilter) {
        query = query.ilike('roll_no', `%${studentRollNoFilter}%`);
      }
      if (studentNameFilter) {
        query = query.ilike('name', `%${studentNameFilter}%`);
      }
      if (classFilter !== 'All Classes') {
        query = query.eq('class', classFilter);
      }
      if (facultyFilter !== 'All Faculties') {
        query = query.eq('faculty', facultyFilter);
      }

      const from = (pageToLoad - 1) * entriesPerPage;
      const to = from + entriesPerPage - 1;
      query = query.range(from, to);
      // Add ordering if desired, e.g., .order('name', { ascending: true })
      query = query.order('created_at', { ascending: false });


      const { data: studentsData, error, count } = await query;

      if (error) {
        throw error;
      }

      if (studentsData) {
        const formattedStudents: StudentRowData[] = studentsData.map(s => ({
          system_id: s.id,
          roll_no: s.roll_no || '',
          registrationNo: s.registration_no || null,
          name: s.name || '',
          academic_year: s.academic_year || '',
          class: s.class || '',
          faculty: s.faculty || '',
        }));
        setStudentsOnPage(formattedStudents);
        setTotalStudentsCount(count || 0);
        // if (pageToLoad === 1) { // Only show toast for initial load/refresh, not every pagination click
        //     toast({ title: "Student Data Loaded", description: `${formattedStudents.length} records fetched for this page. Total: ${count || 0}` });
        }
      } else {
        setStudentsOnPage([]);
        setTotalStudentsCount(0);
        toast({ title: "No Students Found", description: "No student records match your criteria." });
      }
    } catch (error: any) {
      toast({ title: "Error Loading Students", description: error.message || "Could not fetch student data.", variant: "destructive" });
      setStudentsOnPage([]);
      setTotalStudentsCount(0);
    } finally {
      setIsLoadingData(false);
    }
  }, [academicYearFilter, studentRollNoFilter, studentNameFilter, classFilter, facultyFilter, entriesPerPage, toast]);

  // Effect for initial load and when filters change
  useEffect(() => {
    if (authStatus === 'authenticated' && initialFiltersLoaded) {
      handleLoadStudentData(1); // Load page 1 when filters change or on initial authenticated load
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, initialFiltersLoaded, academicYearFilter, studentRollNoFilter, studentNameFilter, classFilter, facultyFilter, entriesPerPage, handleLoadStudentData]); // handleLoadStudentData is memoized

  // Effect for pagination
  useEffect(() => {
    if (authStatus === 'authenticated' && initialFiltersLoaded) {
      handleLoadStudentData(currentPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]); // Do not add handleLoadStudentData here to avoid loop with its own setCurrentPage

  const totalPages = Math.ceil(totalStudentsCount / entriesPerPage);

  const handleViewMarksheet = (student: StudentRowData) => {
    router.push(`/marksheet/view/${student.system_id}`);
  };

  const handleEditStudent = (student: StudentRowData) => {
    router.push(`/marksheet/edit/${student.system_id}`);
  };

  const handleDeleteStudent = (student: StudentRowData) => {
     setStudentToDelete(student); // Set student to delete for single deletion
     setShowDeleteConfirmDialog(true);
  };
  
  const confirmDelete = () => {
    if (studentToDelete) { // Single delete
        executeDeleteStudents([studentToDelete.system_id]);
        setStudentToDelete(null);
    } else if (selectedStudents.size > 0) { // Multi delete
        executeDeleteStudents(Array.from(selectedStudents));
    }
  };

  const executeDeleteStudents = async (studentSystemIds: string[]) => {
    if (studentSystemIds.length === 0) return;

    setIsDeletingSelected(true);
    setShowDeleteConfirmDialog(false);
    let deletedCount = 0;
    let errorCount = 0;

    for (const studentSystemId of studentSystemIds) {
      console.log(`Attempting to delete student with system_id: ${studentSystemId}`);
      try {
        console.log(`Deleting marks for student_detail_id: ${studentSystemId}`);
        const { error: marksError } = await supabase
          .from('student_marks_details')
          .delete()
          .eq('student_detail_id', studentSystemId);
        console.log('Marks deletion response:', { marksError });

        if (marksError) {
          const errMsg = `Could not delete marks for student ID ${studentSystemId.substring(0,8)}... Details: ${marksError.message}`;
          console.error(errMsg);
          toast({ 
            title: "Marks Deletion Error", 
            description: errMsg, 
            variant: "destructive" 
          });
          errorCount++;
          continue; 
        }
        
        console.log(`Deleting student details for id: ${studentSystemId}`);
        const { error: studentError } = await supabase
          .from('student_details')
          .delete()
          .eq('id', studentSystemId);
        console.log('Student deletion response:', { studentError });

        if (studentError) {
          const errMsg = `Failed to delete student ID ${studentSystemId.substring(0,8)}... Details: ${studentError.message}`;
          console.error(errMsg);
          throw new Error(errMsg);
        }
        deletedCount++;
      } catch (error: any) {
        console.error(`Overall deletion error for student ID ${studentSystemId}:`, error);
        toast({ 
            title: "Deletion Error", 
            description: error.message || `An unexpected error occurred while deleting student ID ${studentSystemId.substring(0,8)}...`, 
            variant: "destructive" 
        });
        errorCount++;
      }
    }

    if (deletedCount > 0) toast({ title: "Deletion Processed", description: `${deletedCount} student(s) successfully deleted.` });
    if (errorCount > 0) toast({ title: "Deletion Partially Failed", description: `${errorCount} student(s) could not be fully deleted. Check console for details.`, variant: "destructive" });
    
    setSelectedStudents(new Set()); 
    await handleLoadStudentData(currentPage); // Reload current page data
    
    setIsDeletingSelected(false);
  };

  const handleExportToExcel = async () => {
    if (totalStudentsCount === 0 && studentsOnPage.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no students currently available to export.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    toast({ title: "Exporting Data", description: "Fetching ALL student details and marks, please wait..." });

    // Fetch ALL students matching current filters for export, not just the current page
    let query = supabase
      .from('student_details')
      .select('*, student_marks_details(*)', { count: 'exact' });

    if (academicYearFilter !== 'All Academic Years') {
      query = query.eq('academic_year', academicYearFilter);
    }
    if (studentRollNoFilter) {
      query = query.ilike('roll_no', `%${studentRollNoFilter}%`);
    }
    if (studentNameFilter) {
      query = query.ilike('name', `%${studentNameFilter}%`);
    }
    if (classFilter !== 'All Classes') {
      query = query.eq('class', classFilter);
    }
    if (facultyFilter !== 'All Faculties') {
      query = query.eq('faculty', facultyFilter);
    }
    query = query.order('created_at', { ascending: false });

    const { data: allFilteredStudents, error: exportError } = await query;

    if (exportError || !allFilteredStudents || allFilteredStudents.length === 0) {
      toast({ title: "Export Failed", description: exportError?.message || "No students found for export with current filters.", variant: "destructive" });
      setIsExporting(false);
      return;
    }

    const studentDetailsSheetData: any[] = [];
    const studentMarksDataSheet: any[] = [];

    const studentDetailHeaders = ["System ID", "Roll No", "Registration No", "Name", "Father Name", "Mother Name", "Date of Birth", "Gender", "Faculty", "Class", "Academic Session"];
    const studentMarkHeaders = ["System ID", "Roll No", "Registration No", "Name", "Subject Name", "Subject Category", "Max Marks", "Theory Marks Obtained", "Practical Marks Obtained", "Obtained Total Marks"]; 

    try {
      for (const studentDetails of allFilteredStudents) {
        studentDetailsSheetData.push({
          "System ID": studentDetails.id, "Roll No": studentDetails.roll_no, "Registration No": studentDetails.registration_no || '',
          "Name": studentDetails.name, "Father Name": studentDetails.father_name, "Mother Name": studentDetails.mother_name,
          "Date of Birth": studentDetails.dob ? format(parseISO(studentDetails.dob), 'dd-MM-yyyy') : '',
          "Gender": studentDetails.gender, "Faculty": studentDetails.faculty, "Class": studentDetails.class,
          "Academic Session": studentDetails.academic_year,
        });

        const marksDetails = studentDetails.student_marks_details;

        if (marksDetails && marksDetails.length > 0) {
          for (const mark of marksDetails) {
            studentMarksDataSheet.push({
              "System ID": studentDetails.id, "Roll No": studentDetails.roll_no, "Registration No": studentDetails.registration_no || '', "Name": studentDetails.name,
              "Subject Name": mark.subject_name, "Subject Category": mark.category, "Max Marks": mark.max_marks,
              "Theory Marks Obtained": mark.theory_marks_obtained,
              "Practical Marks Obtained": mark.practical_marks_obtained, "Obtained Total Marks": mark.obtained_total_marks,
            });
          }
        } else {
             studentMarksDataSheet.push({
              "System ID": studentDetails.id, "Roll No": studentDetails.roll_no, "Registration No": studentDetails.registration_no || '', "Name": studentDetails.name,
              "Subject Name": "N/A", "Subject Category": "N/A", "Max Marks": "N/A",
              "Theory Marks Obtained": "N/A", "Practical Marks Obtained": "N/A", "Obtained Total Marks": "N/A",
            });
        }
      }

      const workbook = XLSX.utils.book_new();
      if (studentDetailsSheetData.length > 0) {
        const wsStudentDetails = XLSX.utils.json_to_sheet(studentDetailsSheetData, { header: studentDetailHeaders, skipHeader: false });
        XLSX.utils.book_append_sheet(workbook, wsStudentDetails, "Student Details");
      }
      if (studentMarksDataSheet.length > 0) {
        const wsStudentMarks = XLSX.utils.json_to_sheet(studentMarksDataSheet, { header: studentMarkHeaders, skipHeader: false });
        XLSX.utils.book_append_sheet(workbook, wsStudentMarks, "Student Marks Details");
      }
      
      Object.keys(workbook.Sheets).forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet['!cols']) sheet['!cols'] = [];
        const jsonSheet = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
        if (jsonSheet.length > 0) {
          const cols = jsonSheet[0] as any[]; 
          if (cols) {
            const colWidths = cols.map((_, i) => {
              let maxLen = String(cols[i] || '').length; 
              jsonSheet.forEach((row: any) => { 
                const cellValue = row[i];
                if (cellValue != null) { 
                  const len = String(cellValue).length;
                  if (len > maxLen) maxLen = len;
                }
              });
              return { wch: maxLen + 2 }; 
            });
            sheet['!cols'] = colWidths;
          }
        }
      });

      XLSX.writeFile(workbook, "students_and_marks_export.xlsx");
      toast({ title: "Export Successful", description: `Exported ${allFilteredStudents.length} students and their marks.` });
    } catch (error: any) {
      console.error("Error during Excel export generation:", error);
      toast({ title: "Export Failed", description: error.message || "An unknown error occurred during file generation.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement> | boolean) => {
    const isChecked = typeof event === 'boolean' ? event : event.target.checked;
    if (isChecked) {
      const newSelected = new Set(studentsOnPage.map(student => student.system_id));
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

  const numSelectedOnPage = studentsOnPage.filter(s => selectedStudents.has(s.system_id)).length;
  const isAllSelectedOnPage = studentsOnPage.length > 0 && numSelectedOnPage === studentsOnPage.length;

  const handleConfirmDelete = () => {
    if (selectedStudents.size > 0) {
        setStudentToDelete(null); // Clear single student delete if multi-select is active
        setShowDeleteConfirmDialog(true);
    } else if (studentToDelete) {
        setShowDeleteConfirmDialog(true);
    } else {
        toast({ title: "No Students Selected", description: "Please select students to delete.", variant: "destructive" });
    }
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
                  onClick={() => handleLoadStudentData(1)}
                  disabled={isLoadingData || isDeletingSelected || isExporting}
                >
                  {isLoadingData && !isDeletingSelected && !isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Load Student Data
                </Button>
                <Link href="/marksheet/new" passHref>
                  <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground" disabled={isDeletingSelected || isLoadingData || isExporting}>
                    <FilePlus2 className="mr-2 h-4 w-4" /> Create New
                  </Button>
                </Link>
                <Link href="/import" passHref>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-foreground hover:bg-accent hover:text-accent-foreground"
                    disabled={isDeletingSelected || isLoadingData || isExporting}
                  >
                    <Download className="mr-2 h-4 w-4" /> Import Data 
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground" onClick={handleExportToExcel} disabled={isExporting || isDeletingSelected || (totalStudentsCount === 0 && studentsOnPage.length === 0) || isLoadingData}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Export to Excel
                </Button>
                 {(selectedStudents.size > 0 || studentToDelete) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleConfirmDelete}
                    disabled={isDeletingSelected || isLoadingData || isExporting}
                  >
                    {isDeletingSelected ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} 
                    Delete {studentToDelete ? 'Student' : `Selected (${selectedStudents.size})`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Card className="mb-6 shadow-md">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 items-end">
              <div>
                <Label htmlFor="academicYear">Academic Session</Label>
                <Select value={academicYearFilter} onValueChange={setAcademicYearFilter} disabled={isDeletingSelected || isLoadingData || isExporting}>
                  <SelectTrigger id="academicYear"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dynamicAcademicYearOptions.map(year => <SelectItem key={year} value={year} disabled={year === 'All Academic Years' && dynamicAcademicYearOptions.length === 1}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="studentRollNo">Student Roll No</Label>
                <Input id="studentRollNo" placeholder="Roll No" value={studentRollNoFilter} onChange={e => setStudentRollNoFilter(e.target.value)} disabled={isDeletingSelected || isLoadingData || isExporting} />
              </div>
              <div>
                <Label htmlFor="studentName">Student Name</Label>
                <Input id="studentName" placeholder="Student Name" value={studentNameFilter} onChange={e => setStudentNameFilter(e.target.value)} disabled={isDeletingSelected || isLoadingData || isExporting} />
              </div>
              <div>
                <Label htmlFor="class">Class</Label>
                <Select value={classFilter} onValueChange={setClassFilter} disabled={isDeletingSelected || isLoadingData || isExporting}>
                  <SelectTrigger id="class"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dynamicClassOptions.map(cls => <SelectItem key={cls} value={cls} disabled={cls === 'All Classes' && dynamicClassOptions.length === 1}>{cls}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
               <div>
                <Label htmlFor="faculty">Faculty</Label>
                <Select value={facultyFilter} onValueChange={setFacultyFilter} disabled={isDeletingSelected || isLoadingData || isExporting}>
                  <SelectTrigger id="faculty"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dynamicFacultyOptions.map(fac => <SelectItem key={fac} value={fac} disabled={fac === 'All Faculties' && dynamicFacultyOptions.length === 1}>{fac}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center gap-2">
            <Label htmlFor="showEntries" className="text-sm whitespace-nowrap">Show</Label>
            <Select value={String(entriesPerPage)} onValueChange={(value) => { setEntriesPerPage(Number(value));}} disabled={isDeletingSelected || isLoadingData || isExporting}>
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
                        disabled={isLoadingData || isDeletingSelected || isExporting || studentsOnPage.length === 0}
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
                  {isLoadingData && !isDeletingSelected && !isExporting ? ( 
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground mt-2">Loading student data...</p>
                      </TableCell>
                    </TableRow>
                  ) : studentsOnPage.length > 0 ? studentsOnPage.map((student) => (
                    <TableRow key={student.system_id} data-state={selectedStudents.has(student.system_id) ? "selected" : ""}>
                      <TableCell className="text-center">
                        <Checkbox
                          id={`select-student-${student.system_id}`}
                          checked={selectedStudents.has(student.system_id)}
                          onCheckedChange={() => handleRowSelectClick(student.system_id)}
                          aria-label={`Select student ${student.name}`}
                          disabled={isLoadingData || isDeletingSelected || isExporting}
                        />
                      </TableCell><TableCell>{student.roll_no}</TableCell><TableCell>{student.registrationNo || 'N/A'}</TableCell><TableCell>{student.name}</TableCell><TableCell>{student.academic_year}</TableCell><TableCell>{student.class}</TableCell><TableCell>{student.faculty}</TableCell><TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDeletingSelected || isLoadingData || isExporting}>
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
                        {initialFiltersLoaded ? 'No students found matching your filters. Try adjusting or clearing filters.' :
                          'Click "Load Student Data" or apply filters to view student records.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-2">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              Showing {studentsOnPage.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0} to {Math.min(currentPage * entriesPerPage, totalStudentsCount)} of {totalStudentsCount} entries
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || totalPages === 0 || isDeletingSelected || isLoadingData || isExporting}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0 || isDeletingSelected || isLoadingData || isExporting}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>

      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {' '}
              {studentToDelete ? `student ${studentToDelete.name} (Roll: ${studentToDelete.roll_no})` : `${selectedStudents.size} student(s)`}
              {' '}and all their associated marks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStudentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={buttonVariants({ variant: "destructive" })}
              disabled={isDeletingSelected}
            >
              {isDeletingSelected ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="py-4 border-t border-border mt-auto print:hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground max-w-screen-xl">
          <p className="mb-2 sm:mb-0 text-center sm:text-left">Copyright ©{footerYear || new Date().getFullYear()} by Saryug College, Samastipur, Bihar.</p>
          <p className="text-center sm:text-right">Design By Mantix.</p>
        </div>
      </footer>
    </div>
  );
}

    