
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

interface StudentRowData {
  id: string; 
  name: string;
  academicYear: string; // This refers to the session like "2025-2027"
  studentClass: string; // This refers to class like "11th", "1st Year"
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
      .from('student_details') // Use the correct table name
      .select('student_id, name, faculty, class, academic_year');

    if (error) {
      toast({ title: "Error Loading Students", description: error.message, variant: "destructive" });
      setAllStudents([]);
      setIsLoadingData(false);
      return;
    }

    if (students) {
      const formattedStudents: StudentRowData[] = students.map(s => ({
        id: s.student_id, // student_id is the primary key and used as id here
        name: s.name,
        academicYear: s.academic_year, // This is the session string "YYYY-YYYY"
        studentClass: s.class, // This is "11th", "12th", etc.
        faculty: s.faculty,
      }));
      setAllStudents(formattedStudents);
      setCurrentPage(1); // Reset to first page
      toast({ title: "Student Data Loaded", description: `${formattedStudents.length} students loaded from the database.` });
    } else {
      setAllStudents([]);
      toast({ title: "No Students Found", description: "No student records were returned from the database." });
    }
    setIsLoadingData(false);
  };

  // Apply filters whenever filter values or allStudents change
  useEffect(() => {
    let filtered = allStudents;

    if (academicYearFilter !== 'All Academic Years') {
      filtered = filtered.filter(student => student.academicYear === academicYearFilter);
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
  }, [allStudents, academicYearFilter, studentIdFilter, studentNameFilter, classFilter, startYearFilter, endYearFilter]);


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
    // Add a confirmation dialog here in a real app
    // For now, just a toast and console log.
    toast({ 
      title: 'Confirm Deletion', 
      description: `Are you sure you want to delete ${student.name} (ID: ${student.id})? This action cannot be undone. (Deletion not implemented yet)`,
      variant: 'destructive' 
    });
    console.log("Attempting to delete student (not implemented):", student);
    // Actual deletion logic (example, needs RLS and error handling):
    // const { error: marksError } = await supabase.from('student_marks_details').delete().eq('student_id', student.id);
    // if (marksError) { /* handle error */ }
    // const { error: studentError } = await supabase.from('student_details').delete().eq('student_id', student.id);
    // if (studentError) { /* handle error */ }
    // else { setAllStudents(prev => prev.filter(s => s.id !== student.id)); }
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
            <div className="container mx-auto px-0 sm:px-0 lg:px-0"> {/* Ensures content within this bar aligns with page */}
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
                  <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground">
                    <Upload className="mr-2 h-4 w-4" /> Import Data
                  </Button>
                  <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground">
                    <Download className="mr-2 h-4 w-4" /> Export to Excel
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
                <Label htmlFor="studentCollegeId">Student College Id</Label>
                <Input id="studentCollegeId" placeholder="Student Id" value={studentIdFilter} onChange={e => setStudentIdFilter(e.target.value)} />
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
              <Select value={String(entriesPerPage)} onValueChange={(value) => { setEntriesPerPage(Number(value)); setCurrentPage(1);}}>
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
                        {allStudents.length === 0 && !isLoadingData && !isAuthLoading ? 'Click "Load Student Data" above to view student records.' :
                         isLoadingData ? 'Loading student data...' : 
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

