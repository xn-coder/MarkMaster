
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { MarksheetDisplay } from '@/components/app/marksheet-display';
import type { MarksheetFormData, MarksheetDisplayData, MarksheetSubjectDisplayEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AppHeader } from '@/components/app/app-header';
import type { ACADEMIC_YEAR_OPTIONS } from '@/components/app/marksheet-form-schema';

const defaultPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

export default function ViewMarksheetPage() {
  const router = useRouter();
  const params = useParams();
  const studentSystemId = params.studentId as string; 
  const { toast } = useToast();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [marksheetData, setMarksheetData] = useState<MarksheetDisplayData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          setAuthStatus('unauthenticated');
        } else {
          setAuthStatus('authenticated');
        }
      } catch (e) {
        console.error("Exception during auth check:", e);
        setAuthStatus('unauthenticated');
      }
    };
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated' && studentSystemId) {
      setFooterYear(new Date().getFullYear());
      setIsLoadingData(true);

      const fetchMarksheetData = async () => {
        try {
          const { data: studentDetails, error: studentError } = await supabase
            .from('student_details')
            .select('*')
            .eq('id', studentSystemId) 
            .single();

          if (studentError || !studentDetails) {
            toast({ title: 'Error', description: `Student data not found for ID: ${studentSystemId}. ${studentError?.message || ''}`, variant: 'destructive' });
            setMarksheetData(null);
            setIsLoadingData(false);
            return;
          }

          const { data: subjectMarks, error: marksError } = await supabase
            .from('student_marks_details')
            .select('*')
            .eq('student_detail_id', studentSystemId); 

          if (marksError) {
            toast({ title: 'Error Fetching Subjects', description: marksError.message, variant: 'destructive' });
          }

          let sessionStartYear = new Date().getFullYear() - 1;
          let sessionEndYear = new Date().getFullYear();
          if (studentDetails.academic_year && studentDetails.academic_year.includes('-')) {
            const years = studentDetails.academic_year.split('-');
            sessionStartYear = parseInt(years[0], 10);
            sessionEndYear = parseInt(years[1], 10);
          }

          const formDataFromDb: MarksheetFormData = {
            system_id: studentDetails.id,
            studentName: studentDetails.name,
            fatherName: studentDetails.father_name,
            motherName: studentDetails.mother_name,
            rollNumber: studentDetails.roll_no,
            dateOfBirth: studentDetails.dob ? parseISO(studentDetails.dob) : new Date(),
            gender: studentDetails.gender as MarksheetFormData['gender'],
            faculty: studentDetails.faculty as MarksheetFormData['faculty'],
            academicYear: studentDetails.class as typeof ACADEMIC_YEAR_OPTIONS[number],
            section: studentDetails.section,
            sessionStartYear: sessionStartYear,
            sessionEndYear: sessionEndYear,
            overallPassingThresholdPercentage: 33,
            subjects: subjectMarks?.map(mark => ({
              id: mark.mark_id?.toString() || crypto.randomUUID(),
              subjectName: mark.subject_name,
              category: mark.category as MarksheetSubjectDisplayEntry['category'],
              totalMarks: mark.max_marks,
              passMarks: mark.pass_marks,
              theoryMarksObtained: mark.theory_marks_obtained ?? 0,
              practicalMarksObtained: mark.practical_marks_obtained ?? 0,
            })) || [],
          };

          const subjectsDisplay: MarksheetSubjectDisplayEntry[] = formDataFromDb.subjects.map(s => ({
            ...s,
            obtainedTotal: (s.theoryMarksObtained || 0) + (s.practicalMarksObtained || 0),
          }));

          const compulsoryElectiveSubjects = subjectsDisplay.filter(
            s => s.category === 'Compulsory' || s.category === 'Elective'
          );

          const aggregateMarksCompulsoryElective = compulsoryElectiveSubjects.reduce(
            (sum, s) => sum + s.obtainedTotal,
            0
          );
          const totalPossibleMarksCompulsoryElective = compulsoryElectiveSubjects.reduce(
            (sum, s) => sum + s.totalMarks,
            0
          );

          const overallPercentageDisplay = totalPossibleMarksCompulsoryElective > 0
            ? (aggregateMarksCompulsoryElective / totalPossibleMarksCompulsoryElective) * 100
            : 0;

          let overallResult: 'Pass' | 'Fail' = 'Pass';
          if (overallPercentageDisplay < formDataFromDb.overallPassingThresholdPercentage) {
            overallResult = 'Fail';
          }
          for (const subject of subjectsDisplay) {
            if (subject.obtainedTotal < subject.passMarks) {
              overallResult = 'Fail';
              break;
            }
          }

          const generateMarksheetNo = (faculty: string, rollNumber: string, sessionEndYearNumber: number): string => {
            const facultyCode = faculty.substring(0, 2).toUpperCase();
            const month = format(new Date(), 'MMM').toUpperCase();
            const sequence = String(Math.floor(Math.random() * 900) + 100);
            return `${facultyCode}/${month}/${sessionEndYearNumber}/${rollNumber.slice(-3) || sequence}`;
          };

          const processedData: MarksheetDisplayData = {
            ...formDataFromDb,
            subjects: subjectsDisplay,
            collegeCode: "53010",
            marksheetNo: generateMarksheetNo(formDataFromDb.faculty, formDataFromDb.rollNumber, formDataFromDb.sessionEndYear),
            sessionDisplay: `${formDataFromDb.sessionStartYear}-${formDataFromDb.sessionEndYear}`,
            classDisplay: `${formDataFromDb.academicYear} (${formDataFromDb.section})`,
            aggregateMarksCompulsoryElective,
            totalPossibleMarksCompulsoryElective,
            overallResult,
            overallPercentageDisplay,
            dateOfIssue: format(new Date(), 'MMMM yyyy'),
            place: 'Samastipur',
          };
          setMarksheetData(processedData);

        } catch (error) {
          console.error("Error fetching marksheet data for view:", error);
          toast({ title: 'Fetch Error', description: 'Could not load marksheet data.', variant: 'destructive' });
          setMarksheetData(null);
        } finally {
          setIsLoadingData(false);
        }
      };

      fetchMarksheetData();
    }
  }, [authStatus, studentSystemId, toast, router]);

  if (authStatus === 'loading' || (authStatus === 'authenticated' && isLoadingData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background print:hidden">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{authStatus === 'loading' ? 'Verifying session...' : 'Loading marksheet data...'}</p>
      </div>
    );
  }

  if (authStatus === 'authenticated' && !isLoadingData && !marksheetData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col print:h-full print:bg-white">
        <div className="print:hidden">
          <AppHeader
            pageTitle="SARYUG COLLEGE"
            pageSubtitle={defaultPageSubtitle}
            customRightContent={
              <Button variant="outline" onClick={() => router.push('/')} size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
              </Button>
            }
          />
        </div>
        <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col items-center justify-center print:p-0 print:m-0 print:h-full print:container-none print:max-w-none max-w-screen-xl">
          <h1 className="text-2xl font-bold text-destructive mb-4">Marksheet Not Found</h1>
          <p className="text-muted-foreground mb-6 text-center">The marksheet data for student ID '{studentSystemId}' could not be loaded. <br /> Please check the ID or ensure the student and their marks exist in the database.</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Dashboard
          </Button>
        </main>
        <footer className="py-4 border-t border-border mt-auto print:hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground max-w-screen-xl">
            {footerYear && <p>Copyright ©{footerYear} by Saryug College, Samastipur, Bihar. Design By Mantix.</p>}
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col print:h-full print:bg-white">
      <div className="print:hidden">
        <AppHeader
          pageTitle="SARYUG COLLEGE"
          pageSubtitle={defaultPageSubtitle}
          customRightContent={
            <Button variant="outline" onClick={() => router.push('/')} size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          }
        />
      </div>

      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 print:p-0 print:m-0 print:h-full print:container-none print:max-w-none max-w-screen-xl">
        {marksheetData ? (
          <MarksheetDisplay data={marksheetData} />
        ) : (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)] print:hidden">
            <p className="text-muted-foreground">No marksheet data to display.</p>
          </div>
        )}
      </main>

      <footer className="py-4 border-t border-border mt-auto print:hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground max-w-screen-xl">
          {footerYear && <p>Copyright ©{footerYear} by Saryug College, Samastipur, Bihar. Design By Mantix.</p>}
          {!footerYear && <p>Copyright by Saryug College, Samastipur, Bihar. Design By Mantix.</p>}
        </div>
      </footer>
    </div>
  );
}
