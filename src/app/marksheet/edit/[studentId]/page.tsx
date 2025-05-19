
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { MarksheetForm } from '@/components/app/marksheet-form';
import { MarksheetDisplay } from '@/components/app/marksheet-display';
import type { MarksheetFormData, MarksheetDisplayData, MarksheetSubjectDisplayEntry, SubjectEntryFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AppHeader } from '@/components/app/app-header';
import type { ACADEMIC_YEAR_OPTIONS, SUBJECT_CATEGORIES_OPTIONS } from '@/components/app/marksheet-form-schema';

const defaultPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;


export default function EditMarksheetPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;
  const { toast } = useToast();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [initialData, setInitialData] = useState<MarksheetFormData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [isLoadingFormSubmission, setIsLoadingFormSubmission] = useState(false); 
  const [marksheetData, setMarksheetData] = useState<MarksheetDisplayData | null>(null);
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

      const fetchStudentData = async () => {
        try {
          const { data: studentDetails, error: studentError } = await supabase
            .from('student_details')
            .select('*')
            .eq('student_id', studentId)
            .single();

          if (studentError || !studentDetails) {
            toast({ title: 'Error', description: `Student data not found for ID: ${studentId}. ${studentError?.message || ''}`, variant: 'destructive' });
            setInitialData(null);
            setIsLoadingData(false);
            return;
          }

          const { data: subjectMarks, error: marksError } = await supabase
            .from('student_marks_details')
            .select('*')
            .eq('student_id', studentId);

          if (marksError) {
            toast({ title: 'Error Fetching Subjects', description: marksError.message, variant: 'destructive' });
          }
          
          let sessionStartYear = new Date().getFullYear() -1;
          let sessionEndYear = new Date().getFullYear();
          if (studentDetails.academic_year && studentDetails.academic_year.includes('-')) {
            const years = studentDetails.academic_year.split('-');
            sessionStartYear = parseInt(years[0], 10);
            sessionEndYear = parseInt(years[1], 10);
          }

          const transformedData: MarksheetFormData = {
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
              id: mark.id?.toString() || crypto.randomUUID(), 
              subjectName: mark.subject_name,
              category: mark.category as typeof SUBJECT_CATEGORIES_OPTIONS[number],
              totalMarks: mark.max_marks,
              passMarks: mark.pass_marks,
              theoryMarksObtained: mark.theory_marks_obtained ?? 0,
              practicalMarksObtained: mark.practical_marks_obtained ?? 0,
            })) || [],
          };
          
          setInitialData(transformedData);

        } catch (error) {
          console.error("Error fetching student data for edit:", error);
          toast({ title: 'Fetch Error', description: 'Could not load student data.', variant: 'destructive' });
          setInitialData(null);
        } finally {
          setIsLoadingData(false);
        }
      };

      fetchStudentData();
    } else if (authStatus === 'unauthenticated') {
         router.push('/login');
    }
  }, [authStatus, studentId, toast, router]);

  const generateMarksheetNo = (faculty: string, rollNumber: string, sessionEndYearNumber: number): string => {
    const facultyCode = faculty.substring(0, 2).toUpperCase();
    const month = format(new Date(), 'MMM').toUpperCase();
    const sequence = String(Math.floor(Math.random() * 900) + 100); 
    return `${facultyCode}/${month}/${sessionEndYearNumber}/${rollNumber.slice(-3) || sequence}`;
  };
  
  const processFormData = (data: MarksheetFormData): MarksheetDisplayData => {
    const subjectsDisplay: MarksheetSubjectDisplayEntry[] = data.subjects.map(s => ({
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
    if (overallPercentageDisplay < data.overallPassingThresholdPercentage) {
      overallResult = 'Fail';
    }
    for (const subject of subjectsDisplay) {
        if (subject.obtainedTotal < subject.passMarks) {
            overallResult = 'Fail'; 
            break;
        }
    }

    return {
      ...data,
      subjects: subjectsDisplay,
      collegeCode: "53010", 
      marksheetNo: generateMarksheetNo(data.faculty, data.rollNumber, data.sessionEndYear),
      sessionDisplay: `${data.sessionStartYear}-${data.sessionEndYear}`,
      classDisplay: `${data.academicYear} (${data.section})`, 
      aggregateMarksCompulsoryElective,
      totalPossibleMarksCompulsoryElective,
      overallResult,
      overallPercentageDisplay,
      dateOfIssue: format(new Date(), 'MMMM yyyy'),
      place: 'Samastipur',
    };
  };

  const handleFormSubmit = async (data: MarksheetFormData) => {
    setIsLoadingFormSubmission(true);
    // TODO: Implement Supabase update logic here
    // 1. Update student_details table
    // 2. Delete existing student_marks_details for this student
    // 3. Insert new student_marks_details
    try {
      const processedData = processFormData(data);
      setMarksheetData(processedData);
      toast({
        title: 'Marksheet Data Processed',
        description: 'Previewing the updated marksheet. Saving to database is not yet implemented for edits.',
      });
    } catch (error) {
      console.error("Error processing marksheet:", error);
      toast({
        title: 'Error',
        description: 'Could not process marksheet data for preview.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingFormSubmission(false);
    }
  };

  const handleCreateNewFromPreview = () => {
    router.push('/marksheet/new'); 
  };
  
  const handleBackToForm = () => {
    setMarksheetData(null); 
  }


  if (authStatus === 'loading' || (authStatus === 'authenticated' && isLoadingData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{authStatus === 'loading' ? 'Verifying session...' : 'Loading student data...'}</p>
      </div>
    );
  }
  
  if (authStatus === 'authenticated' && !isLoadingData && !initialData) {
     return (
      <div className="min-h-screen bg-background text-foreground flex flex-col print:h-full">
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
        <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col items-center justify-center print:p-0 print:m-0 print:h-full print:container-none print:max-w-none">
            <h1 className="text-2xl font-bold text-destructive mb-4">Student Not Found</h1>
            <p className="text-muted-foreground mb-6 text-center">The student data for ID '{studentId}' could not be loaded from the database. <br/> Please check the ID or ensure the student record exists.</p>
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
    <div className="min-h-screen bg-background text-foreground flex flex-col print:bg-white print:h-full">
      <div className="print:hidden">
        <AppHeader 
            pageTitle="SARYUG COLLEGE"
            pageSubtitle={defaultPageSubtitle}
            customRightContent={
            <Button variant="outline" onClick={() => marksheetData ? handleBackToForm() : router.push('/')} size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> 
                {marksheetData ? 'Back to Edit Form' : 'Back to Dashboard'}
            </Button>
            }
        />
      </div>
      
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 print:p-0 print:m-0 print:h-full print:container-none print:max-w-none">
        <div className="mb-6 text-center print:hidden">
            <h1 className="text-2xl font-bold text-primary">
                {marksheetData ? 'Updated Marksheet Preview' : `Edit Marksheet for ${initialData?.studentName || 'Student'}`}
            </h1>
            <p className="text-muted-foreground">
                {marksheetData ? 'Review the updated marksheet below.' : 'Modify the student and subject details.'}
            </p>
        </div>

        {!marksheetData ? (
          initialData && <MarksheetForm onSubmit={handleFormSubmit} isLoading={isLoadingFormSubmission} initialData={initialData} isEditMode={true} />
        ) : (
          <MarksheetDisplay data={marksheetData} onCreateNew={handleCreateNewFromPreview} />
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
    
