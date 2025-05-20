
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { format, parseISO } from 'date-fns';
import type { StudentRowData } from '@/types';


const ACADEMIC_YEARS = ['All Academic Years', '2025-2027', '2024-2028', '2024-2026', '2023-2025', '2022-2024', '2022-2023', '2021-2023', '2021-2022', '2018-2019'];
const START_YEARS = ['All Start Years', ...Array.from({ length: new Date().getFullYear() + 1 - 2018 + 1 }, (_, i) => (2018 + i).toString()).reverse()];
const END_YEARS = ['All End Years', ...Array.from({ length: new Date().getFullYear() + 2 - 2019 + 1 }, (_, i) => (2019 + i).toString()).reverse()];
const CLASSES = ['All Classes', '1st Year', '2nd Year', '3rd Year', '10th', '11th', '12th', 'B.A.', 'B.Com', 'B.Tech'];

const dashboardPageTitle = "SARYUG COLLEGE";
const dashboardPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [allStudents, setAllStudents] = useState<StudentRowData[]>([]);
  const [displayedStudents, setDisplayedStudents] = useState<StudentRowData[]>([]);


  const [academicYearFilter, setAcademicYearFilter] = useState('All Academic Years');
  const [startYearFilter, setStartYearFilter] = useState('All Start Years');
  const [endYearFilter, setEndYearFilter] = useState('All End Years');
  const [studentIdFilter, setStudentIdFilter] = useState(''); // This will filter by roll_no
  const [studentNameFilter, setStudentNameFilter] = useState('');
  const [classFilter, setClassFilter] = useState('All Classes');

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  useEffect(() => {
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
    const { data: studentsData, error } = await supabase
      .from('student_details')
      .select('id, roll_no, name, faculty, class, academic_year'); // Fetch new 'id' (UUID) and 'roll_no'

    if (error) {
      toast({ title: "Error Loading Students", description: error.message, variant: "destructive" });
      setAllStudents([]);
    } else if (studentsData) {
      const formattedStudents: StudentRowData[] = studentsData.map(s => ({
        system_id: s.id, // Map DB 'id' to 'system_id'
        roll_no: s.roll_no, // Map DB 'roll_no' to 'roll_no'
        name: s.name,
        academicYear: s.academic_year,
        studentClass: s.class,
        faculty: s.faculty,
      }));
      setAllStudents(formattedStudents);
      toast({ title: "Student Data Loaded", description: `${formattedStudents.length} records fetched.` });
    } else {
      setAllStudents([]);
      toast({ title: "No Students Found", description: "No student records were returned from the database." });
    }
    setIsLoadingData(false);
  };
  
  // Apply filters when allStudents or filter criteria change
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
    if (studentIdFilter) { // This now filters by roll_no
      filtered = filtered.filter(student => student.roll_no.toLowerCase().includes(studentIdFilter.toLowerCase()));
    }
    if (studentNameFilter) {
      filtered = filtered.filter(student => student.name.toLowerCase().includes(studentNameFilter.toLowerCase()));
    }
    if (classFilter !== 'All Classes') {
      filtered = filtered.filter(student => student.studentClass === classFilter);
    }

    setDisplayedStudents(filtered);
    setCurrentPage(1); // Reset to first page on filter change
  }, [allStudents, academicYearFilter, startYearFilter, endYearFilter, studentIdFilter, studentNameFilter, classFilter]);


  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return displayedStudents.slice(startIndex, startIndex + entriesPerPage);
  }, [displayedStudents, currentPage, entriesPerPage]);

  const totalPages = Math.ceil(displayedStudents.length / entriesPerPage);

  const handleViewMarksheet = (student: StudentRowData) => {
    router.push(`/marksheet/view/${student.system_id}`); // Use system_id for navigation
  };

  const handleEditStudent = (student: StudentRowData) => {
    router.push(`/marksheet/edit/${student.system_id}`); // Use system_id for navigation
  };

  const handleDeleteStudent = async (student: StudentRowData) => {
    const { error: marksError } = await supabase
      .from('student_marks_details')
      .delete()
      .eq('student_detail_id', student.system_id); // Use system_id for FK

    if (marksError) {
      toast({
        title: 'Error Deleting Marks',
        description: `Could not delete marks for ${student.name}: ${marksError.message}`,
        variant: 'destructive',
      });
      return;
    }

    const { error: studentError } = await supabase
      .from('student_details')
      .delete()
      .eq('id', student.system_id); // Use system_id for PK

    if (studentError) {
      toast({
        title: 'Error Deleting Student',
        description: `Could not delete ${student.name}: ${studentError.message}. Their marks might have been deleted. Please check.`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Student Deleted',
        description: `${student.name} (Roll No: ${student.roll_no}) and their marks have been deleted.`,
      });
      setAllStudents(prev => prev.filter(s => s.system_id !== student.system_id));
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
    toast({ title: "Exporting Data", description: "Fetching student details and marks, please wait..." });

    const studentDetailsDataSheet = [];
    const studentMarksDataSheet = [];

    try {
      for (const displayedStudent of displayedStudents) {
        const { data: studentDetails, error: studentError } = await supabase
          .from('student_details')
          .select('*')
          .eq('id', displayedStudent.system_id) // Fetch by system_id
          .single();

        if (studentError || !studentDetails) {
          console.error(`Error fetching details for student ${displayedStudent.system_id}:`, studentError);
          continue;
        }

        studentDetailsDataSheet.push({
          "Student System ID": studentDetails.id,
          "Roll No": studentDetails.roll_no,
          "Name": studentDetails.name,
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
          .eq('student_detail_id', studentDetails.id); // Fetch marks by system_id (FK)

        if (marksError) {
          console.error(`Error fetching marks for student ${studentDetails.id}:`, marksError);
        }

        if (marksDetails && marksDetails.length > 0) {
          for (const mark of marksDetails) {
            studentMarksDataSheet.push({
              "Student System ID": studentDetails.id,
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
          studentMarksDataSheet.push({
            "Student System ID": studentDetails.id,
            "Roll No": studentDetails.roll_no,
            "Name": studentDetails.name,
            "Subject Name": "N/A", "Subject Category": "N/A", "Max Marks": "N/A", "Pass Marks": "N/A",
            "Theory Marks Obtained": "N/A", "Practical Marks Obtained": "N/A", "Obtained Total Marks": "N/A",
          });
        }
      }

      if (studentDetailsDataSheet.length === 0 && studentMarksDataSheet.length === 0) {
        toast({ title: "No Detailed Data", description: "Could not fetch detailed data for the selected students.", variant: "destructive" });
        setIsExporting(false);
        return;
      }

      const workbook = XLSX.utils.book_new();

      if (studentDetailsDataSheet.length > 0) {
        const wsStudentDetails = XLSX.utils.json_to_sheet(studentDetailsDataSheet);
        XLSX.utils.book_append_sheet(workbook, wsStudentDetails, "Student Details");
      }

      if (studentMarksDataSheet.length > 0) {
        const wsStudentMarks = XLSX.utils.json_to_sheet(studentMarksDataSheet);
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

  if (isAuthLoading) {
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

      <main className="flex-grow container mx-auto px-4 py-6 sm:px-6 lg:px-8">
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
                  disabled={isLoadingData}
                >
                  {isLoadingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Load Student Data
                </Button>
                <Link href="/marksheet/new" passHref>
                  <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground">
                    <FilePlus2 className="mr-2 h-4 w-4" /> Create New
                  </Button>
                </Link>
                <Link href="/import" passHref>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Import Data
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground" onClick={handleExportToExcel} disabled={isExporting}>
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
                <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                  <SelectTrigger id="academicYear"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startYear">Start Year</Label>
                <Select value={startYearFilter} onValueChange={setStartYearFilter}>
                  <SelectTrigger id="startYear"><SelectValue placeholder="Start Year" /></SelectTrigger>
                  <SelectContent>
                    {START_YEARS.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="endYear">End Year</Label>
                <Select value={endYearFilter} onValueChange={setEndYearFilter}>
                  <SelectTrigger id="endYear"><SelectValue placeholder="End Year" /></SelectTrigger>
                  <SelectContent>
                    {END_YEARS.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="studentCollegeId">Student Roll No</Label> {/* Changed label */}
                <Input id="studentCollegeId" placeholder="Roll No" value={studentIdFilter} onChange={e => setStudentIdFilter(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="studentName">Student Name</Label>
                <Input id="studentName" placeholder="Student Name" value={studentNameFilter} onChange={e => setStudentNameFilter(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="class">Class</Label>
                <Select value={classFilter} onValueChange={setClassFilter}>
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
            <Select value={String(entriesPerPage)} onValueChange={(value) => { setEntriesPerPage(Number(value)); setCurrentPage(1); }}>
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
                    <TableHead className="text-white">Roll No</TableHead> {/* Changed header */}
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
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground mt-2">Loading student data...</p>
                      </TableCell>
                    </TableRow>
                  ) : paginatedStudents.length > 0 ? paginatedStudents.map((student) => (
                    <TableRow key={student.system_id}> {/* Use system_id as key */}
                      <TableCell>{student.roll_no}</TableCell> {/* Display roll_no */}
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.academicYear}</TableCell>
                      <TableCell>{student.studentClass}</TableCell>
                      <TableCell>{student.faculty}</TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {allStudents.length === 0 && !isLoadingData ? 'Click "Load Student Data" above to view student records, or "Import Data".' :
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
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
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
