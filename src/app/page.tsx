
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  RefreshCw,
  FilePlus2, // Changed from PlusSquare
  Upload,
  Download,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';

interface StudentRowData {
  id: string; // Student Id
  name: string;
  academicYear: string;
  studentClass: string;
  faculty: string;
}

const mockStudents: StudentRowData[] = [
  { id: '2004', name: 'Rohan', academicYear: '2025-2027', studentClass: '11th', faculty: 'SCIENCE' },
  { id: '68532', name: 'Prashik Likhar', academicYear: '2018-2019', studentClass: '1st', faculty: 'COMMERCE' },
  { id: '2001', name: 'Aniket', academicYear: '2021-2022', studentClass: '11th', faculty: 'ARTS' },
  { id: '1005', name: 'Priya Sharma', academicYear: '2023-2025', studentClass: '12th', faculty: 'SCIENCE' },
  { id: '1006', name: 'Amit Patel', academicYear: '2022-2024', studentClass: 'B.Com', faculty: 'COMMERCE' },
  { id: '1007', name: 'Sneha Reddy', academicYear: '2024-2026', studentClass: '10th', faculty: 'GENERAL' },
  { id: '1008', name: 'Vikram Singh', academicYear: '2023-2025', studentClass: 'B.A.', faculty: 'ARTS' },
  { id: '1009', name: 'Sunita Devi', academicYear: '2021-2023', studentClass: '12th', faculty: 'ARTS' },
  { id: '1010', name: 'Rajesh Kumar', academicYear: '2024-2028', studentClass: 'B.Tech', faculty: 'ENGINEERING' },
  { id: '1011', name: 'Deepika Rao', academicYear: '2025-2027', studentClass: '11th', faculty: 'COMMERCE' },
  { id: '1012', name: 'Arjun Mehta', academicYear: '2022-2023', studentClass: '10th', faculty: 'GENERAL' },
];

const ACADEMIC_YEARS = ['All Academic Years', '2025-2027', '2024-2028', '2024-2026', '2023-2025', '2022-2024', '2022-2023', '2021-2023', '2021-2022', '2018-2019'];
const CLASSES = ['All Classes', '1st', '10th', '11th', '12th', 'B.A.', 'B.Com', 'B.Tech'];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Filters
  const [academicYearFilter, setAcademicYearFilter] = useState('All Academic Years');
  const [studentIdFilter, setStudentIdFilter] = useState('');
  const [rollNoFilter, setRollNoFilter] = useState('');
  const [studentNameFilter, setStudentNameFilter] = useState('');
  const [classFilter, setClassFilter] = useState('All Classes');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  useEffect(() => {
    setIsClient(true);
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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: 'Logout Failed', description: error.message, variant: 'destructive' });
      setIsLoggingOut(false);
    } else {
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      // onAuthStateChange will handle redirect
    }
  };
  
  const filteredStudents = useMemo(() => {
    return mockStudents.filter(student => {
      if (academicYearFilter !== 'All Academic Years' && student.academicYear !== academicYearFilter) return false;
      if (studentIdFilter && !student.id.toLowerCase().includes(studentIdFilter.toLowerCase())) return false;
      // Roll No. filter logic would require roll no. in data
      if (studentNameFilter && !student.name.toLowerCase().includes(studentNameFilter.toLowerCase())) return false;
      if (classFilter !== 'All Classes' && student.studentClass !== classFilter) return false;
      return true;
    });
  }, [academicYearFilter, studentIdFilter, studentNameFilter, classFilter]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return filteredStudents.slice(startIndex, startIndex + entriesPerPage);
  }, [filteredStudents, currentPage, entriesPerPage]);

  const totalPages = Math.ceil(filteredStudents.length / entriesPerPage);

  if (!isClient || isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* College Header */}
      <header className="bg-secondary text-secondary-foreground py-3 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://placehold.co/50x50.png"
              alt="College Logo"
              width={50}
              height={50}
              className="rounded-full"
              data-ai-hint="college logo"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-primary">
                SARYUG COLLEGE
              </h1>
              <p className="text-xs text-muted-foreground">
                Affiliated By Bihar School Examination Board | [Estd. - 1983]
              </p>
              <p className="text-xs text-muted-foreground">[College Code: 53010]</p>
            </div>
          </div>
          <Button variant="default" onClick={handleLogout} disabled={isLoggingOut} size="sm">
            {isLoggingOut ? <Loader2 className="animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />} Logout
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Student Details Bar */}
        <section className="mb-6">
          <div className="bg-primary text-primary-foreground p-3 rounded-md shadow-md flex flex-col sm:flex-row justify-between items-center gap-2">
            <h2 className="text-xl font-semibold">STUDENT DETAILS</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground">
                <FilePlus2 className="mr-2 h-4 w-4" /> Create New
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground">
                <Upload className="mr-2 h-4 w-4" /> Import Data
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-accent hover:text-accent-foreground">
                <Download className="mr-2 h-4 w-4" /> Export to Excel
              </Button>
            </div>
          </div>
        </section>

        {/* Filter Card */}
        <Card className="mb-6 shadow-md">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
              <div className="lg:col-span-1">
                <Label htmlFor="academicYear">Academic Year</Label>
                <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                  <SelectTrigger id="academicYear"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="studentCollegeId">Student College Id</Label>
                <Input id="studentCollegeId" placeholder="Student Id" value={studentIdFilter} onChange={e => setStudentIdFilter(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rollNo">Roll No.</Label>
                <Input id="rollNo" placeholder="Roll No." value={rollNoFilter} onChange={e => setRollNoFilter(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="studentName">Student Name</Label>
                <Input id="studentName" placeholder="Student Name" value={studentNameFilter} onChange={e => setStudentNameFilter(e.target.value)} />
              </div>
              <div className="lg:col-span-1">
                <Label htmlFor="class">Class</Label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger id="class"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLASSES.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full lg:w-auto bg-primary hover:bg-accent">
                <Search className="mr-2 h-4 w-4" /> Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Student Table Card */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Label htmlFor="showEntries" className="text-sm">Show</Label>
              <Select value={String(entriesPerPage)} onValueChange={(value) => setEntriesPerPage(Number(value))}>
                <SelectTrigger id="showEntries" className="w-20 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map(num => <SelectItem key={num} value={String(num)}>{num}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
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
                            <DropdownMenuItem>View Marksheet</DropdownMenuItem>
                            <DropdownMenuItem>Edit Student</DropdownMenuItem>
                            <DropdownMenuItem>Delete Student</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No students found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filteredStudents.length)} of {filteredStudents.length} entries
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

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border mt-auto">
        <p>Copyright ©{new Date().getFullYear()} by Saryug College, Samastipur, Bihar. Design By Mantix.</p>
      </footer>
    </div>
  );
}

