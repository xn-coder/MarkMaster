// EditMarksheetPage.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { MarksheetForm } from '@/components/app/marksheet-form';
import { MarksheetDisplay } from '@/components/app/marksheet-display';
import type { MarksheetFormData, MarksheetDisplayData, MarksheetSubjectDisplayEntry, SubjectEntryFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AppHeader } from '@/components/app/app-header';
import { numberToWords } from '@/lib/utils';
import type { ACADEMIC_YEAR_OPTIONS } from '@/components/app/marksheet-form-schema';

// IMPORT SERVER ACTIONS for MySQL data interaction
import {
  fetchMarksheetForEditAction,
  updateMarksheetAction,
  type FetchMarksheetForEditResult,
  type UpdateMarksheetResult
} from '@/app/admin/actions';

const defaultPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

// UPDATED: Fixed thresholds for fallback if subject-specific pass marks are not provided
const FIXED_THEORY_PASS_THRESHOLD = 21;
const FIXED_PRACTICAL_PASS_THRESHOLD = 9;

export default function EditMarksheetPage() {
  const router = useRouter();
  const params = useParams();
  const studentSystemId = params.studentId as string;
  const { toast } = useToast();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [initialData, setInitialData] = useState<MarksheetFormData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [isLoadingFormSubmission, setIsLoadingFormSubmission] = useState(false);
  const [marksheetData, setMarksheetData] = useState<MarksheetDisplayData | null>(null);
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
      
      const fetchStudentData = async () => {
        setIsLoadingData(true);
        try {
          const result: FetchMarksheetForEditResult = await fetchMarksheetForEditAction(studentSystemId);

          if (result.success && result.data) {
            setInitialData(result.data);
            toast({ title: 'Student Data Loaded', description: 'Data loaded successfully for editing.' });
          } else {
            toast({ 
                title: 'Error Loading Student Data', 
                description: result.message || `Student data not found for ID: ${studentSystemId}.`, 
                variant: 'destructive' 
            });
            setInitialData(null);
            router.push('/');
          }
        } catch (error: any) {
          console.error("Error fetching student data for edit:", error);
          toast({ title: 'Fetch Error', description: `Could not load student data: ${error.message}`, variant: 'destructive' });
          setInitialData(null);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchStudentData();
    } else if (authStatus === 'authenticated' && !studentSystemId) {
        toast({ title: 'Error', description: 'No student ID provided for editing.', variant: 'destructive' });
        setIsLoadingData(false);
        router.push('/');
    }
  }, [authStatus, studentSystemId, toast, router]);

  // --- CLIENT-SIDE DATA PROCESSING FOR DISPLAY (UPDATED for new pass marks) ---
  const processFormData = (data: MarksheetFormData): MarksheetDisplayData => {
    const subjectsDisplay: MarksheetSubjectDisplayEntry[] = data.subjects.map(s => {
      const obtainedTotal = (s.theoryMarksObtained || 0) + (s.practicalMarksObtained || 0);
      
      let isTheoryFailed = false;
      let isPracticalFailed = false;

      // Determine theory failure: use subject's theoryPassMarks if present, otherwise fixed threshold
      const theoryPassThreshold = s.theoryPassMarks !== null && s.theoryPassMarks !== undefined 
                                  ? s.theoryPassMarks 
                                  : FIXED_THEORY_PASS_THRESHOLD;
      if (typeof s.theoryMarksObtained === 'number' && s.theoryMarksObtained < theoryPassThreshold) {
        isTheoryFailed = true;
      }

      // Determine practical failure: use subject's practicalPassMarks if present, otherwise fixed threshold
      const practicalPassThreshold = s.practicalPassMarks !== null && s.practicalPassMarks !== undefined
                                    ? s.practicalPassMarks
                                    : FIXED_PRACTICAL_PASS_THRESHOLD;
      if (!isTheoryFailed && typeof s.practicalMarksObtained === 'number' && s.practicalMarksObtained < practicalPassThreshold) {
         isPracticalFailed = true;
      }
      
      const isSubjectFailed = isTheoryFailed || isPracticalFailed;

      return {
        ...s,
        id: s.id || crypto.randomUUID(),
        obtainedTotal,
        isFailed: isSubjectFailed,
        isTheoryFailed,
        isPracticalFailed,
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
    if (subjectsDisplay.some(subject => subject.isFailed && (subject.category === 'Compulsory' || subject.category === 'Elective'))) {
      overallResult = 'Fail';
    }
    if (overallPercentageDisplay < data.overallPassingThresholdPercentage) {
        overallResult = 'Fail';
    }

    const generateMarksheetNo = (faculty: string, rollNumber: string, sessionEndYear: number): string => {
        const facultyCode = faculty.substring(0, 2).toUpperCase();
        const month = format(new Date(), 'MMM').toUpperCase();
        const sequence = String(Math.floor(Math.random() * 900) + 100);
        return `${facultyCode}/${month}/${sessionEndYear}/${rollNumber.slice(-3) || sequence}`;
    };
    const marksheetNo = generateMarksheetNo(data.faculty, data.rollNumber, data.sessionEndYear);

    return {
      ...data,
      system_id: data.system_id || studentSystemId,
      collegeCode: "53010",
      marksheetNo: marksheetNo,
      subjects: subjectsDisplay,
      sessionDisplay: `${data.sessionStartYear}-${data.sessionEndYear}`,
      classDisplay: `${data.academicYear}`,
      aggregateMarksCompulsoryElective,
      totalPossibleMarksCompulsoryElective,
      totalMarksInWords,
      overallResult,
      overallPercentageDisplay,
      dateOfIssue: format(data.dateOfIssue, 'MMMM yyyy'),
      place: 'Samastipur',
      registrationNo: data.registrationNo || null,
    };
  };

  const handleFormSubmit = async (data: MarksheetFormData) => {
    setIsLoadingFormSubmission(true);

    if (!studentSystemId) {
      toast({ title: 'Error', description: 'Student System ID is missing. Cannot update.', variant: 'destructive' });
      setIsLoadingFormSubmission(false);
      return;
    }

    try {
      const result: UpdateMarksheetResult = await updateMarksheetAction(studentSystemId, data);

      if (result.success) {
        toast({
          title: 'Marksheet Updated Successfully',
          description: result.message,
        });
        const processedData = processFormData(data);
        setMarksheetData(processedData);
      } else {
        toast({
          title: 'Update Failed',
          description: result.message + (result.errorDetails ? ` Details: ${result.errorDetails}` : ''),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error("Error updating marksheet via server action:", error);
      toast({
        title: 'Operation Error',
        description: `An unexpected error occurred during update: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingFormSubmission(false);
    }
  };

  const handleBackToForm = () => {
    setMarksheetData(null);
  };

  if (authStatus === 'loading' || (authStatus === 'authenticated' && isLoadingData && !initialData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background print:hidden">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{authStatus === 'loading' ? 'Verifying session...' : 'Loading student data...'}</p>
      </div>
    );
  }
  
  if (authStatus === 'authenticated' && !isLoadingData && !initialData && studentSystemId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col print:h-full print:bg-white">
        <div className="print:hidden">
          <AppHeader pageSubtitle={defaultPageSubtitle} />
        </div>
        <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col items-center justify-center print:p-0 print:m-0 print:h-full print:container-none print:max-w-none max-w-screen-xl">
        <div className="w-full flex justify-start mb-6 print:hidden">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-destructive mb-4">Student Not Found</h1>
          <p className="text-muted-foreground mb-6 text-center">The student data for ID '{studentSystemId}' could not be loaded. <br /> Please check the ID or ensure the student record exists.</p>
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
        <div className="flex justify-start mb-6 print:hidden">
            <Button variant="outline" onClick={() => marksheetData ? handleBackToForm() : router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        </div>
        <div className="mb-6 text-center print:hidden">
          <h1 className="text-2xl font-bold text-primary">
            {marksheetData ? 'Updated Marksheet Preview' : `Edit Marksheet for ${initialData?.studentName || 'Student'} (Roll: ${initialData?.rollNumber})`}
          </h1>
          <p className="text-muted-foreground">
            {marksheetData ? 'Review the updated marksheet below. Data has been saved.' : 'Modify the student and subject details.'}
          </p>
        </div>

        {!marksheetData ? (
          initialData && <MarksheetForm onSubmit={handleFormSubmit} isLoading={isLoadingFormSubmission} initialData={initialData} isEditMode={true} />
        ) : (
          <MarksheetDisplay data={marksheetData} onEditBack={handleBackToForm} />
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