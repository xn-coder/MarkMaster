'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client'; // KEEP for AUTH
import { MarksheetForm } from '@/components/app/marksheet-form';
import { MarksheetDisplay } from '@/components/app/marksheet-display';
import type { MarksheetFormData, MarksheetDisplayData, MarksheetSubjectDisplayEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns'; // Keep for client-side formatting
import { AppHeader } from '@/components/app/app-header';
import { numberToWords } from '@/lib/utils';
// Assuming these types are string arrays or similar, otherwise import actual types
// import type { ACADEMIC_YEAR_OPTIONS, SUBJECT_CATEGORIES_OPTIONS } from '@/components/app/marksheet-form-schema';


// IMPORT SERVER ACTIONS
import {
  fetchMarksheetForEditAction,
  updateMarksheetAction,
  type FetchMarksheetForEditResult, // Optional for type safety
  type UpdateMarksheetResult         // Optional for type safety
} from '@/app/admin/actions'; // Adjust path if needed


const defaultPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;


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

  // --- AUTHENTICATION LOGIC (NO CHANGE) ---
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

  // --- MODIFIED: DATA FETCHING LOGIC ---
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated' && studentSystemId) {
      setFooterYear(new Date().getFullYear());
      setIsLoadingData(true);

      const loadInitialData = async () => {
        try {
          // CALL SERVER ACTION TO FETCH DATA
          const result: FetchMarksheetForEditResult = await fetchMarksheetForEditAction(studentSystemId);

          if (result.success && result.data) {
            setInitialData(result.data);
          } else {
            toast({ title: 'Error Fetching Student', description: result.message || `Student data not found for ID: ${studentSystemId}.`, variant: 'destructive' });
            setInitialData(null);
          }
        } catch (error) {
          console.error("Error fetching student data for edit (client):", error);
          toast({ title: 'Fetch Error', description: 'Could not load student data.', variant: 'destructive' });
          setInitialData(null);
        } finally {
          setIsLoadingData(false);
        }
      };
      loadInitialData();
    }
  }, [authStatus, studentSystemId, toast, router]);

  // --- CLIENT-SIDE DATA PROCESSING (NO CHANGE) ---
  const generateMarksheetNo = useCallback((faculty: string, rollNumber: string, sessionEndYearNumber: number): string => {
    // ... (same implementation)
    const facultyCode = faculty.substring(0, 2).toUpperCase();
    const month = format(new Date(), 'MMM').toUpperCase();
    const sequence = String(Math.floor(Math.random() * 900) + 100);
    return `${facultyCode}/${month}/${sessionEndYearNumber}/${rollNumber.slice(-3) || sequence}`;
  }, []);

  const processFormData = (data: MarksheetFormData): MarksheetDisplayData => {
    // ... (same implementation, ensure data.system_id is correctly handled)
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

    const totalMarksInWords = numberToWords(aggregateMarksCompulsoryElective);

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
    const marksheetNo = generateMarksheetNo(data.faculty, data.rollNumber, data.sessionEndYear);

    return {
      ...data,
      system_id: data.system_id || studentSystemId, // Use existing system_id
      collegeCode: "53010",
      subjects: subjectsDisplay,
      sessionDisplay: `${data.sessionStartYear}-${data.sessionEndYear}`,
      classDisplay: `${data.academicYear}`,
      aggregateMarksCompulsoryElective,
      totalPossibleMarksCompulsoryElective,
      totalMarksInWords,
      overallResult,
      overallPercentageDisplay,
      dateOfIssue: format(new Date(data.dateOfIssue), 'MMMM yyyy'), // Ensure data.dateOfIssue is a Date
      place: 'Samastipur',
      registrationNo: data.registrationNo,
    };
  };

  // --- MODIFIED: HANDLE FORM SUBMIT ---
  const handleFormSubmit = async (data: MarksheetFormData) => {
    setIsLoadingFormSubmission(true);

    if (!studentSystemId) {
      toast({ title: 'Error', description: 'Student System ID is missing. Cannot update.', variant: 'destructive' });
      setIsLoadingFormSubmission(false);
      return;
    }

    try {
      // CALL SERVER ACTION TO UPDATE DATA
      const result: UpdateMarksheetResult = await updateMarksheetAction(studentSystemId, data);

      if (result.success) {
        const processedData = processFormData(data); // Process the submitted data for display
        setMarksheetData(processedData);
        toast({
          title: 'Marksheet Updated Successfully',
          description: result.message,
        });
      } else {
        toast({
          title: 'Update Failed',
          description: result.message + (result.errorDetails ? ` Details: ${result.errorDetails}` : ''),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error("Error updating marksheet (client):", error);
      toast({
        title: 'Update Failed',
        description: `Could not update marksheet data: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingFormSubmission(false);
    }
  };

  const handleBackToForm = () => {
    setMarksheetData(null); // This will hide the display and show the form with initialData
  }

  // --- LOADING AND ERROR STATES (NO MAJOR CHANGE, BUT DRIVEN BY NEW DATA FLOW) ---
  if (authStatus === 'loading' || (authStatus === 'authenticated' && isLoadingData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background print:hidden">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{authStatus === 'loading' ? 'Verifying session...' : 'Loading student data...'}</p>
      </div>
    );
  }

  if (authStatus === 'authenticated' && !isLoadingData && !initialData) {
    // ... (Student Not Found JSX - no change)
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
          </div>
        </footer>
      </div>
    );
  }
  
  // --- REMAINDER OF THE COMPONENT (JSX) - NO SIGNIFICANT CHANGES NEEDED ---
  // The JSX structure remains the same as it's driven by the component's state.
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col print:h-full print:bg-white">
       <div className="print:hidden">
        <AppHeader pageSubtitle={defaultPageSubtitle} />
      </div>
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 print:p-0 print:m-0 print:h-full print:container-none print:max-w-none max-w-screen-xl">
        <div className="flex justify-start mb-6 print:hidden">
            <Button variant="outline" onClick={() => router.back()}>
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
          // Pass initialData to MarksheetDisplay if you want the "edit back" button to work with original pre-edit state.
          // Otherwise, if onEditBack should just clear the preview and show the form again for further edits on the *already submitted* data,
          // then the `initialData` for the form might need to be the `data` that was last submitted.
          // For simplicity, onEditBack here will revert to showing the form which will be pre-filled with `initialData` (the state from page load).
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