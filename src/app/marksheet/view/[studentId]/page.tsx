
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { MarksheetDisplay } from '@/components/app/marksheet-display';
import type { MarksheetFormData, MarksheetDisplayData, MarksheetSubjectDisplayEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AppHeader } from '@/components/app/app-header';
import { numberToWords } from '@/lib/utils';
import type { ACADEMIC_YEAR_OPTIONS } from '@/components/app/marksheet-form-schema';

const defaultPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

const THEORY_PASS_THRESHOLD = 30;
const PRACTICAL_PASS_THRESHOLD = 33;

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
      } catch (e: any) {
        console.error("Exception during auth check:", e);
        toast({ title: 'Authentication Error', description: e.message || 'Failed to check session.', variant: 'destructive' });
        setAuthStatus('unauthenticated');
      }
    };
    checkAuthentication();
  }, [toast]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated' && studentSystemId) {
      setFooterYear(new Date().getFullYear());
      
      const fetchMarksheetData = async () => {
        setIsLoadingData(true);
        try {
          const { data: studentDetails, error: studentError } = await supabase
            .from('student_details')
            .select('*')
            .eq('id', studentSystemId) // Use 'id' for UUID
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
            .eq('student_detail_id', studentSystemId); // Use 'student_detail_id'

          if (marksError) {
            toast({ title: 'Error Fetching Subjects', description: marksError.message, variant: 'destructive' });
          }

          let sessionStartYearNum = new Date().getFullYear() - 1;
          let sessionEndYearNum = new Date().getFullYear();
          if (studentDetails.academic_year && studentDetails.academic_year.includes('-')) {
            const years = studentDetails.academic_year.split('-');
            if (years.length === 2 && !isNaN(parseInt(years[0])) && !isNaN(parseInt(years[1]))) {
                sessionStartYearNum = parseInt(years[0], 10);
                sessionEndYearNum = parseInt(years[1], 10);
            }
          }
          
          const formDataFromDb: Omit<MarksheetFormData, 'overallPassingThresholdPercentage' | 'subjects'> & { subjects: Omit<SubjectEntryFormData, 'passMarks'>[] } = {
            system_id: studentDetails.id,
            studentName: studentDetails.name,
            fatherName: studentDetails.father_name,
            motherName: studentDetails.mother_name,
            registrationNo: studentDetails.registration_no || null,
            rollNumber: studentDetails.roll_no,
            dateOfBirth: studentDetails.dob ? parseISO(studentDetails.dob) : new Date(),
            dateOfIssue: new Date(), 
            gender: studentDetails.gender as MarksheetFormData['gender'],
            faculty: studentDetails.faculty as MarksheetFormData['faculty'],
            academicYear: studentDetails.class as typeof ACADEMIC_YEAR_OPTIONS[number],
            sessionStartYear: sessionStartYearNum,
            sessionEndYear: sessionEndYearNum,
            subjects: subjectMarks?.map(mark => ({
              id: mark.mark_id?.toString() || crypto.randomUUID(),
              subjectName: mark.subject_name,
              category: mark.category as SubjectEntryFormData['category'],
              totalMarks: mark.max_marks,
              // passMarks removed
              theoryMarksObtained: mark.theory_marks_obtained ?? 0,
              practicalMarksObtained: mark.practical_marks_obtained ?? 0,
            })) || [],
          };

          const subjectsDisplay: MarksheetSubjectDisplayEntry[] = formDataFromDb.subjects.map(s => {
            const obtainedTotal = (s.theoryMarksObtained || 0) + (s.practicalMarksObtained || 0);
            let subjectFailed = false;
            if ((s.theoryMarksObtained ?? 0) > 0 && (s.theoryMarksObtained ?? 0) < THEORY_PASS_THRESHOLD) {
                subjectFailed = true;
            }
            if (!subjectFailed && (s.practicalMarksObtained ?? 0) > 0 && (s.practicalMarksObtained ?? 0) < PRACTICAL_PASS_THRESHOLD) {
                subjectFailed = true;
            }
            return {
              ...s,
              id: s.id || crypto.randomUUID(),
              obtainedTotal,
              isFailed: subjectFailed,
            };
          });

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

          const totalMarksInWords = numberToWords(aggregateMarksCompulsoryElective);

          let overallResult: 'Pass' | 'Fail' = 'Pass';
          if (subjectsDisplay.some(subject => subject.isFailed)) {
            overallResult = 'Fail';
          }

          const processedData: MarksheetDisplayData = {
            system_id: formDataFromDb.system_id,
            studentName: formDataFromDb.studentName,
            fatherName: formDataFromDb.fatherName,
            motherName: formDataFromDb.motherName,
            registrationNo: formDataFromDb.registrationNo,
            rollNumber: formDataFromDb.rollNumber,
            dateOfBirth: formDataFromDb.dateOfBirth,
            dateOfIssue: format(formDataFromDb.dateOfIssue, 'MMMM yyyy'),
            gender: formDataFromDb.gender,
            faculty: formDataFromDb.faculty,
            academicYear: formDataFromDb.academicYear,
            sessionStartYear: formDataFromDb.sessionStartYear,
            sessionEndYear: formDataFromDb.sessionEndYear,
            subjects: subjectsDisplay,
            collegeCode: "53010",
            sessionDisplay: `${formDataFromDb.sessionStartYear}-${formDataFromDb.sessionEndYear}`,
            classDisplay: `${formDataFromDb.academicYear}`,
            aggregateMarksCompulsoryElective,
            totalPossibleMarksCompulsoryElective,
            totalMarksInWords,
            overallResult,
            overallPercentageDisplay,
            place: 'Samastipur',
          };
          setMarksheetData(processedData);

        } catch (error: any) {
          console.error("Error fetching marksheet data for view:", error);
          toast({ title: 'Fetch Error', description: `Could not load marksheet data: ${error.message || 'Unknown error'}`, variant: 'destructive' });
          setMarksheetData(null);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchMarksheetData();
    } else if (authStatus === 'authenticated' && !studentSystemId) {
        toast({ title: 'Error', description: 'No student ID provided for viewing.', variant: 'destructive' });
        setIsLoadingData(false);
        router.push('/');
    }
  }, [authStatus, studentSystemId, toast, router]);

  const handleNavigateToEdit = useCallback((id: string) => {
    router.push(`/marksheet/edit/${id}`);
  }, [router]);


  if (authStatus === 'loading' || (authStatus === 'authenticated' && isLoadingData && !marksheetData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background print:hidden">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{authStatus === 'loading' ? 'Verifying session...' : 'Loading marksheet data...'}</p>
      </div>
    );
  }
  
  if (authStatus === 'authenticated' && !isLoadingData && !marksheetData && studentSystemId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col print:h-full print:bg-white">
        <div className="print:hidden">
          <AppHeader pageSubtitle={defaultPageSubtitle} />
        </div>
        <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col items-center justify-center print:p-0 print:m-0 print:h-full print:container-none print:max-w-none max-w-screen-xl">
          <div className="flex justify-start w-full mb-6 print:hidden">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
          </div>
          <h1 className="text-2xl font-bold text-destructive mb-4">Marksheet Not Found</h1>
          <p className="text-muted-foreground mb-6 text-center">The marksheet data for student ID '{studentSystemId}' could not be loaded. <br /> Please check the ID or ensure the student and their marks exist in the database.</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Dashboard
          </Button>
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col print:h-full print:bg-white">
      <div className="print:hidden">
        <AppHeader pageSubtitle={defaultPageSubtitle} />
      </div>

      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 print:p-0 print:m-0 print:h-full print:container-none print:max-w-none max-w-screen-xl">
        <div className="flex justify-start w-full mb-6 print:hidden">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        </div>
        {marksheetData ? (
          <MarksheetDisplay 
            data={marksheetData} 
            onNavigateToEdit={studentSystemId ? () => handleNavigateToEdit(studentSystemId) : undefined}
          />
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
