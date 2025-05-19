
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
  const studentId = params.studentId as string;
  const { toast } = useToast();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [marksheetData, setMarksheetData] = useState<MarksheetDisplayData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        setAuthStatus('unauthenticated');
        router.push('/login');
      } else {
        setAuthStatus('authenticated');
      }
    };
    checkAuthentication();
  }, [router]);

  useEffect(() => {
    if (authStatus === 'authenticated' && studentId) {
      setFooterYear(new Date().getFullYear());
      setIsLoadingData(true);

      const fetchMarksheetData = async () => {
        try {
          const { data: studentDetails, error: studentError } = await supabase
            .from('student_details')
            .select('*')
            .eq('student_id', studentId)
            .single();

          if (studentError || !studentDetails) {
            toast({ title: 'Error', description: `Student data not found for ID: ${studentId}. ${studentError?.message || ''}`, variant: 'destructive' });
            setMarksheetData(null);
            setIsLoadingData(false);
            return;
          }

          const { data: subjectMarks, error: marksError } = await supabase
            .from('student_marks_details')
            .select('*')
            .eq('student_id', studentId);

          if (marksError) {
            toast({ title: 'Error Fetching Subjects', description: marksError.message, variant: 'destructive' });
            // Potentially proceed with student data but empty subjects
          }

          let sessionStartYear = new Date().getFullYear() -1;
          let sessionEndYear = new Date().getFullYear();
          if (studentDetails.academic_year && studentDetails.academic_year.includes('-')) {
            const years = studentDetails.academic_year.split('-');
            sessionStartYear = parseInt(years[0], 10);
            sessionEndYear = parseInt(years[1], 10);
          }
          
          const formDataFromDb: MarksheetFormData = {
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
            overallPassingThresholdPercentage: 33, // This might need to be fetched or configured
            subjects: subjectMarks?.map(mark => ({
              id: mark.id?.toString() || crypto.randomUUID(),
              subjectName: mark.subject_name,
              category: mark.category as MarksheetSubjectDisplayEntry['category'],
              totalMarks: mark.max_marks,
              passMarks: mark.pass_marks,
              theoryMarksObtained: mark.theory_marks_obtained ?? 0,
              practicalMarksObtained: mark.practical_marks_obtained ?? 0,
            })) || [],
          };
          
          // Process this formData into MarksheetDisplayData
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
            const month = format(new Date(), 'MMM').toUpperCase(); // Or use a fixed month if needed
            const sequence = String(Math.floor(Math.random() * 900) + 100); // Placeholder
            return `${facultyCode}/${month}/${sessionEndYearNumber}/${rollNumber.slice(-3) || sequence}`;
          };
          
          const processedData: MarksheetDisplayData = {
            ...formDataFromDb,
            subjects: subjectsDisplay,
            marksheetNo: generateMarksheetNo(formDataFromDb.faculty, formDataFromDb.rollNumber, formDataFromDb.sessionEndYear), // Consider if marksheetNo should be stored or always generated
            sessionDisplay: `${formDataFromDb.sessionStartYear}-${formDataFromDb.sessionEndYear}`,
            classDisplay: `${formDataFromDb.academicYear} (${formDataFromDb.section})`, 
            aggregateMarksCompulsoryElective,
            totalPossibleMarksCompulsoryElective,
            overallResult,
            overallPercentageDisplay,
            dateOfIssue: format(new Date(), 'MMMM yyyy'), // Or use student's record creation/update date
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
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, studentId, toast, router]);


  if (authStatus === 'loading' || (authStatus === 'authenticated' && isLoadingData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{authStatus === 'loading' ? 'Verifying session...' : 'Loading marksheet data...'}</p>
      </div>
    );
  }
  
  if (authStatus === 'authenticated' && !isLoadingData && !marksheetData) {
     return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <AppHeader 
          pageTitle="SARYUG COLLEGE"
          pageSubtitle={defaultPageSubtitle}
          customRightContent={
            <Button variant="outline" onClick={() => router.push('/')} size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          }
        />
        <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Marksheet Not Found</h1>
            <p className="text-muted-foreground mb-6 text-center">The marksheet data for student ID '{studentId}' could not be loaded. <br/> Please check the ID or ensure the student and their marks exist in the database.</p>
            <Button onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Dashboard
            </Button>
        </main>
         <footer className="py-4 border-t border-border mt-auto print:hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground">
                {footerYear && <p>Copyright ©{footerYear} by Saryug College, Samastipur, Bihar. Design By Mantix.</p>}
            </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col print:bg-white">
      <div className="print:hidden"> {/* Hide AppHeader on print */}
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
      
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 print:p-0 print:m-0">
        {marksheetData ? (
          <MarksheetDisplay data={marksheetData} isViewMode={true} />
        ) : (
           <div className="flex items-center justify-center min-h-[calc(100vh-200px)]"> {/* Fallback if data is still null after loading */}
             <p className="text-muted-foreground">No marksheet data to display.</p>
           </div>
        )}
      </main>

      <footer className="py-4 border-t border-border mt-auto print:hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground">
            {footerYear && <p>Copyright ©{footerYear} by Saryug College, Samastipur, Bihar. Design By Mantix.</p>}
            {!footerYear && <p>Copyright by Saryug College, Samastipur, Bihar. Design By Mantix.</p>}
        </div>
      </footer>
    </div>
  );
}
