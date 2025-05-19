
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { MarksheetForm } from '@/components/app/marksheet-form';
import { MarksheetDisplay } from '@/components/app/marksheet-display';
import type { MarksheetFormData, MarksheetDisplayData, MarksheetSubjectDisplayEntry, SubjectEntryFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { AppHeader } from '@/components/app/app-header';

// Mock student data - in a real app, this would come from an API/Supabase
const mockStudentDatabase: Record<string, Partial<MarksheetFormData>> = {
  '2004': { // Rohan Kumar from dashboard mock
    studentName: 'Rohan Kumar',
    fatherName: 'Mr. Kumar',
    motherName: 'Mrs. Kumar',
    rollNumber: 'RK101',
    dateOfBirth: new Date('2007-05-15'),
    gender: 'Male',
    faculty: 'SCIENCE',
    academicYear: '11th',
    section: 'A',
    sessionStartYear: 2025,
    overallPassingThresholdPercentage: 33,
    subjects: [
      { subjectName: 'Physics', category: 'Compulsory', totalMarks: 100, passMarks: 33, theoryMarksObtained: 60, practicalMarksObtained: 25 },
      { subjectName: 'Chemistry', category: 'Compulsory', totalMarks: 100, passMarks: 33, theoryMarksObtained: 55, practicalMarksObtained: 28 },
      { subjectName: 'Mathematics', category: 'Compulsory', totalMarks: 100, passMarks: 33, theoryMarksObtained: 70, practicalMarksObtained: 0 },
      { subjectName: 'English', category: 'Elective', totalMarks: 100, passMarks: 33, theoryMarksObtained: 65, practicalMarksObtained: 0 },
    ],
  },
   '68532': { // Prashik Likhar
    studentName: 'Prashik Likhar',
    fatherName: 'Mr. Likhar',
    motherName: 'Mrs. Likhar',
    rollNumber: 'PL202',
    dateOfBirth: new Date('2002-08-20'),
    gender: 'Male',
    faculty: 'COMMERCE',
    academicYear: '1st Year',
    section: 'B',
    sessionStartYear: 2018,
    overallPassingThresholdPercentage: 40,
    subjects: [
      { subjectName: 'Accountancy', category: 'Compulsory', totalMarks: 100, passMarks: 40, theoryMarksObtained: 75, practicalMarksObtained: 0 },
      { subjectName: 'Business Studies', category: 'Compulsory', totalMarks: 100, passMarks: 40, theoryMarksObtained: 68, practicalMarksObtained: 0 },
      { subjectName: 'Economics', category: 'Compulsory', totalMarks: 100, passMarks: 40, theoryMarksObtained: 72, practicalMarksObtained: 0 },
    ],
  },
};


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
  const [initialData, setInitialData] = useState<Partial<MarksheetFormData> | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [isLoadingFormSubmission, setIsLoadingFormSubmission] = useState(false); 
  const [marksheetData, setMarksheetData] = useState<MarksheetDisplayData | null>(null);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        setAuthStatus('unauthenticated');
      } else {
        setAuthStatus('authenticated');
      }
    };
    checkAuthentication();
  }, []); 

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      setFooterYear(new Date().getFullYear());
      if (studentId) {
        setTimeout(() => {
          const data = mockStudentDatabase[studentId];
          if (data) {
            setInitialData(data);
          } else {
            toast({ title: 'Error', description: 'Student data not found.', variant: 'destructive' });
            router.push('/'); 
          }
          setIsLoadingData(false);
        }, 500); 
      }
    }
  }, [authStatus, router, studentId, toast]);

  const generateMarksheetNo = (faculty: string, rollNumber: string, sessionEndYear: number): string => {
    const facultyCode = faculty.substring(0, 2).toUpperCase();
    const month = format(new Date(), 'MMM').toUpperCase();
    const sequence = String(Math.floor(Math.random() * 900) + 100); 
    return `${facultyCode}/${month}/${sessionEndYear}/${rollNumber.slice(-3) || sequence}`;
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
    try {
      const processedData = processFormData(data);
      setMarksheetData(processedData);
      toast({
        title: 'Marksheet Updated',
        description: 'Previewing the updated marksheet.',
      });
    } catch (error) {
      console.error("Error processing marksheet:", error);
      toast({
        title: 'Error',
        description: 'Could not process marksheet data.',
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


  if (authStatus === 'loading' || (authStatus === 'authenticated' && isLoadingData && !initialData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{authStatus === 'loading' ? 'Verifying session...' : 'Loading student data...'}</p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }
  
  if (authStatus === 'authenticated' && !isLoadingData && !initialData) {
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
            <h1 className="text-2xl font-bold text-destructive mb-4">Student Not Found</h1>
            <p className="text-muted-foreground mb-6">The student data for ID '{studentId}' could not be loaded.</p>
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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
      
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
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

