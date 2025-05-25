// NewMarksheetPage.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { MarksheetForm } from '@/components/app/marksheet-form';
import { MarksheetDisplay } from '@/components/app/marksheet-display';
import type { MarksheetFormData, MarksheetDisplayData, MarksheetSubjectDisplayEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { AppHeader } from '@/components/app/app-header';
import { numberToWords } from '@/lib/utils';

// IMPORT SERVER ACTIONS
import {
  checkExistingStudentAction,
  saveMarksheetAction,
  type SaveMarksheetResult
} from '@/app/admin/actions';

const defaultPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

// UPDATED: Fixed thresholds for fallback if subject-specific pass marks are not provided
const FIXED_THEORY_PASS_THRESHOLD = 21;
const FIXED_PRACTICAL_PASS_THRESHOLD = 9;

export default function NewMarksheetPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [isLoadingFormSubmission, setIsLoadingFormSubmission] = useState(false);
  const [marksheetData, setMarksheetData] = useState<MarksheetDisplayData | null>(null);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Authentication error on new marksheet page:", error.message);
          setAuthStatus('unauthenticated');
        } else if (!session) {
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
    } else if (authStatus === 'authenticated') {
      setFooterYear(new Date().getFullYear());
    }
  }, [authStatus, router]);

  const generateMarksheetNo = (faculty: string, rollNumber: string, sessionEndYear: number): string => {
    const facultyCode = faculty.substring(0, 2).toUpperCase();
    const month = format(new Date(), 'MMM').toUpperCase();
    const sequence = String(Math.floor(Math.random() * 900) + 100);
    return `${facultyCode}/${month}/${sessionEndYear}/${rollNumber.slice(-3) || sequence}`;
  };
  
  const processFormData = (data: MarksheetFormData, systemId: string): MarksheetDisplayData => {
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
      if (typeof s.practicalMarksObtained === 'number' && s.practicalMarksObtained < practicalPassThreshold) {
        isPracticalFailed = true;
      }

      // A subject fails if either theory or practical component fails
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

    const marksheetNo = generateMarksheetNo(data.faculty, data.rollNumber, data.sessionEndYear);

    return {
      ...data,
      system_id: systemId,
      collegeCode: "53010",
      registrationNo: data.registrationNo || null,
      marksheetNo: marksheetNo,
      subjects: subjectsDisplay,
      sessionDisplay: `${data.sessionStartYear}-${data.sessionEndYear}`,
      classDisplay: `${data.academicYear}`,
      aggregateMarksCompulsoryElective,
      totalPossibleMarksCompulsoryElective,
      totalMarksInWords,
      overallResult,
      overallPercentageDisplay,
      dateOfIssue: format(new Date(data.dateOfIssue), 'MMMM yyyy'), 
      place: 'Samastipur',
    };
  };

  const handleFormSubmit = async (data: MarksheetFormData) => {
    setIsLoadingFormSubmission(true);
    const academicSessionString = `${data.sessionStartYear}-${data.sessionEndYear}`;

    try {
      const checkResult = await checkExistingStudentAction(
        data.rollNumber, academicSessionString, data.academicYear, data.faculty, data.registrationNo
      );

      if (checkResult.error) {
        toast({ title: 'Error', description: `Failed to check for existing student: ${checkResult.error}`, variant: 'destructive' });
        setIsLoadingFormSubmission(false);
        return;
      }
      if (checkResult.exists) {
        toast({ title: 'Student Already Exists', description: 'A student with the same Roll No., Academic Session, Class, Faculty, and Registration No. (if provided) already exists.', variant: 'destructive' });
        setIsLoadingFormSubmission(false);
        return;
      }

      const saveResult = await saveMarksheetAction(data);

      if (saveResult.success && saveResult.studentId) {
        toast({ title: 'Marksheet Data Saved', description: saveResult.message });
        const processedDataForDisplay = processFormData(data, saveResult.studentId);
        setMarksheetData(processedDataForDisplay);
      } else {
        toast({ title: 'Failed to Save Marksheet', description: saveResult.message + (saveResult.errorDetails ? ` Details: ${saveResult.errorDetails}` : ''), variant: 'destructive' });
      }
    } catch (error) {
      console.error("Error during form submission process:", error);
      let message = 'An unexpected error occurred during submission.';
      if (error instanceof Error) { message = error.message; }
      toast({ title: 'Operation Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoadingFormSubmission(false);
    }
  };

  const handleCreateNew = () => { setMarksheetData(null); };

  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col print:h-full">
      <AppHeader pageSubtitle={defaultPageSubtitle} />
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 print:p-0 print:m-0 print:h-full print:container-none print:max-w-none max-w-screen-xl">
        <div className="flex justify-start mb-6 print:hidden">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        </div>
        <div className="mb-6 text-center print:hidden">
          <h1 className="text-2xl font-bold text-primary">
            {marksheetData ? 'Marksheet Preview' : 'Create New Marksheet'}
          </h1>
          <p className="text-muted-foreground">
            {marksheetData ? 'Review the generated marksheet below. Data has been submitted.' : 'Enter Student and Subject Details to generate a marksheet.'}
          </p>
        </div>

        {!marksheetData ? (
          <MarksheetForm onSubmit={handleFormSubmit} isLoading={isLoadingFormSubmission} />
        ) : (
          <MarksheetDisplay data={marksheetData} onCreateNew={handleCreateNew} />
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