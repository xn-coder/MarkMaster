'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client'; // KEEP for AUTHENTICATION ONLY
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
import * as XLSX from 'xlsx'; // Still used for client-side Excel generation
import { format, parseISO } from 'date-fns';
import type { StudentRowData } from '@/types';

// IMPORT SERVER ACTIONS for MySQL data interaction
import {
  loadStudentsForDashboardAction,
  deleteStudentAction,
  fetchStudentsForExportAction,
  fetchDistinctStudentFiltersAction
} from '@/app/admin/actions'; // Adjust path if needed

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

  const fetchDistinctFilterValues = useCallback(async () => {
    try {
      const result = await fetchDistinctStudentFiltersAction();

      if (result.error) {
        throw new Error(result.error);
      }

      setDynamicAcademicYearOptions(['All Academic Years', ...result.academicYears]);
      setDynamicClassOptions(['All Classes', ...result.classes]);
      setDynamicFacultyOptions(['All Faculties', ...result.faculties]);
      
      setInitialFiltersLoaded(true);
    } catch (error: any) {
      toast({ title: "Error Loading Filter Options", description: error.message || "Could not fetch distinct values for filters.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated' && !initialFiltersLoaded) {
      fetchDistinctFilterValues();
    }
  }, [authStatus, router, initialFiltersLoaded, fetchDistinctFilterValues]);

  const handleLoadStudentData = useCallback(async (pageToLoad = 1) => {
    setIsLoadingData(true);
    setSelectedStudents(new Set());
    setCurrentPage(pageToLoad);

    try {
      const filters = {
        academicYear: academicYearFilter !== 'All Academic Years' ? academicYearFilter : null,
        rollNo: studentRollNoFilter || null,
        name: studentNameFilter || null,
        className: classFilter !== 'All Classes' ? classFilter : null,
        faculty: facultyFilter !== 'All Faculties' ? facultyFilter : null,
      };

      const limit = entriesPerPage;
      const offset = (pageToLoad - 1) * entriesPerPage;

      const result = await loadStudentsForDashboardAction(filters, limit, offset);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.students && result.students.length > 0) {
        setStudentsOnPage(result.students);
        setTotalStudentsCount(result.totalCount || 0);
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

  useEffect(() => {
    if (authStatus === 'authenticated' && initialFiltersLoaded) {
      handleLoadStudentData(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, initialFiltersLoaded, academicYearFilter, studentRollNoFilter, studentNameFilter, classFilter, facultyFilter, entriesPerPage]);

  useEffect(() => {
    if (authStatus === 'authenticated' && initialFiltersLoaded) {
      if (currentPage !== 1 || (academicYearFilter === 'All Academic Years' && !studentRollNoFilter && !studentNameFilter && classFilter === 'All Classes' && facultyFilter === 'All Faculties')) {
          handleLoadStudentData(currentPage);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]); 

  const totalPages = Math.ceil(totalStudentsCount / entriesPerPage);

  const handleViewMarksheet = (student: StudentRowData) => {
    router.push(`/marksheet/view/${student.system_id}`);
  };

  const handleEditStudent = (student: StudentRowData) => {
    router.push(`/marksheet/edit/${student.system_id}`);
  };

  const handleDeleteStudent = (student: StudentRowData) => {
     setStudentToDelete(student);
     setShowDeleteConfirmDialog(true);
  };
  
  const confirmDelete = useCallback(async () => {
    setShowDeleteConfirmDialog(false);
    setIsDeletingSelected(true);
    let idsToDelete: string[] = [];

    if (studentToDelete) {
        idsToDelete = [studentToDelete.system_id];
        setStudentToDelete(null);
    } else if (selectedStudents.size > 0) {
        idsToDelete = Array.from(selectedStudents);
    } else {
        toast({ title: "No Students Selected", description: "No students to delete.", variant: "destructive" });
        setIsDeletingSelected(false);
        return;
    }

    try {
      const result = await deleteStudentAction(idsToDelete);

      if (result.success) {
        toast({ title: "Deletion Successful", description: result.message });
      } else {
        toast({ title: "Deletion Failed", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      console.error(`Overall deletion error:`, error);
      toast({ 
          title: "Deletion Error", 
          description: error.message || `An unexpected error occurred during deletion.`, 
          variant: "destructive" 
      });
    } finally {
      setSelectedStudents(new Set());
      await handleLoadStudentData(currentPage);
      setIsDeletingSelected(false);
    }
  }, [studentToDelete, selectedStudents, toast, currentPage, handleLoadStudentData]);

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

    try {
      const filters = {
        academicYear: academicYearFilter !== 'All Academic Years' ? academicYearFilter : null,
        rollNo: studentRollNoFilter || null,
        name: studentNameFilter || null,
        className: classFilter !== 'All Classes' ? classFilter : null,
        faculty: facultyFilter !== 'All Faculties' ? facultyFilter : null,
      };

      const allFilteredStudentsWithMarks = await fetchStudentsForExportAction(filters); 

      if (!allFilteredStudentsWithMarks || allFilteredStudentsWithMarks.length === 0) {
        toast({ title: "Export Failed", description: "No students found for export with current filters.", variant: "destructive" });
        setIsExporting(false);
        return;
      }

      const studentDetailsSheetData: any[] = [];
      const studentMarksDataSheet: any[] = [];

      const studentDetailHeaders = ["System ID", "Roll No", "Registration No", "Name", "Father Name", "Mother Name", "Date of Birth", "Gender", "Faculty", "Class", "Academic Session"];
      const studentMarkHeaders = ["System ID", "Roll No", "Registration No", "Name", "Subject Name", "Subject Category", "Max Marks", "Theory Marks Obtained", "Practical Marks Obtained", "Obtained Total Marks"]; 

      for (const studentDetail of allFilteredStudentsWithMarks) {
        studentDetailsSheetData.push({
          "System ID": studentDetail.id,
          "Roll No": studentDetail.rollNo || '',
          "Registration No": studentDetail.registrationNo || '',
          "Name": studentDetail.name || '',
          "Father Name": studentDetail.fatherName || '',
          "Mother Name": studentDetail.motherName || '',
          "Date of Birth": studentDetail.dob ? format(studentDetail.dob, 'dd-MM-yyyy') : '',
          "Gender": studentDetail.gender || '',
          "Faculty": studentDetail.faculty || '',
          "Class": studentDetail.class || '',
          "Academic Session": studentDetail.academicYear || '',
        });

        const marksDetails = studentDetail.marks;

        if (marksDetails && marksDetails.length > 0) {
          for (const mark of marksDetails) {
            studentMarksDataSheet.push({
              "System ID": studentDetail.id, "Roll No": studentDetail.rollNo || '', "Registration No": studentDetail.registrationNo || '', "Name": studentDetail.name || '',
              "Subject Name": mark.subjectName, "Subject Category": mark.category, "Max Marks": mark.maxMarks,
              "Theory Marks Obtained": mark.theoryMarksObtained,
              "Practical Marks Obtained": mark.practicalMarksObtained, "Obtained Total Marks": mark.obtainedTotalMarks,
            });
          }
        } else {
             studentMarksDataSheet.push({
              "System ID": studentDetail.id, "Roll No": studentDetail.rollNo || '', "Registration No": studentDetail.registrationNo || '', "Name": studentDetail.name || '',
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
      toast({ title: "Export Successful", description: `Exported ${allFilteredStudentsWithMarks.length} students and their marks.` });
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
    if (selectedStudents.size > 0 || studentToDelete) {
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
                <Select value={academicYearFilter} onValueChange={setAcademicYearFilter} disabled={isDeletingSelected || isExporting}> {/* Removed isLoadingData */}
                  <SelectTrigger id="academicYear"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dynamicAcademicYearOptions.map(year => <SelectItem key={year} value={year} disabled={year === 'All Academic Years' && dynamicAcademicYearOptions.length === 1}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="studentRollNo">Student Roll No</Label>
                <Input id="studentRollNo" placeholder="Roll No" value={studentRollNoFilter} onChange={e => setStudentRollNoFilter(e.target.value)} disabled={isDeletingSelected || isExporting} /> {/* Removed isLoadingData */}
              </div>
              <div>
                <Label htmlFor="studentName">Student Name</Label>
                <Input id="studentName" placeholder="Student Name" value={studentNameFilter} onChange={e => setStudentNameFilter(e.target.value)} disabled={isDeletingSelected || isExporting} /> {/* Removed isLoadingData */}
              </div>
              <div>
                <Label htmlFor="class">Class</Label>
                <Select value={classFilter} onValueChange={setClassFilter} disabled={isDeletingSelected || isExporting}> {/* Removed isLoadingData */}
                  <SelectTrigger id="class"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dynamicClassOptions.map(cls => <SelectItem key={cls} value={cls} disabled={cls === 'All Classes' && dynamicClassOptions.length === 1}>{cls}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
               <div>
                <Label htmlFor="faculty">Faculty</Label>
                <Select value={facultyFilter} onValueChange={setFacultyFilter} disabled={isDeletingSelected || isExporting}> {/* Removed isLoadingData */}
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
            <Select value={String(entriesPerPage)} onValueChange={(value) => { setEntriesPerPage(Number(value));}} disabled={isDeletingSelected || isExporting}> {/* Removed isLoadingData */}
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
                      </TableCell>
                      <TableCell>{student.roll_no}</TableCell>
                      <TableCell>{student.registrationNo || 'N/A'}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.academic_year}</TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell>{student.faculty}</TableCell>
                      <TableCell className="text-center">
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
              {studentToDelete ? `student ${studentToDelete.name} (Roll: ${studentToDelete.roll_no})` : `${selectedStudents.size} selected student(s)`}
              {' '}and all their associated marks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setStudentToDelete(null); setShowDeleteConfirmDialog(false); }}>Cancel</AlertDialogCancel>
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