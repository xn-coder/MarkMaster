
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { numberToWords } from '@/lib/utils';
import type { ACADEMIC_YEAR_OPTIONS } from '@/components/app/marksheet-form-schema';

const defaultPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

const THEORY_PASS_THRESHOLD = 30;
const PRACTICAL_PASS_THRESHOLD = 33;

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
          const { data: studentDetails, error: studentError } = await supabase
            .from('student_details')
            .select('*')
            .eq('id', studentSystemId)
            .single();

          if (studentError || !studentDetails) {
            toast({ title: 'Error Fetching Student', description: `Student data not found for ID: ${studentSystemId}. ${studentError?.message || ''}`, variant: 'destructive' });
            setInitialData(null);
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

          let sessionStartYearNum = new Date().getFullYear() - 1;
          let sessionEndYearNum = new Date().getFullYear();
          if (studentDetails.academic_year && studentDetails.academic_year.includes('-')) {
            const years = studentDetails.academic_year.split('-');
            if (years.length === 2 && !isNaN(parseInt(years[0])) && !isNaN(parseInt(years[1]))) {
                sessionStartYearNum = parseInt(years[0], 10);
                sessionEndYearNum = parseInt(years[1], 10);
            }
          }
          
          const transformedData: MarksheetFormData = {
            system_id: studentDetails.id,
            studentName: studentDetails.name,
            fatherName: studentDetails.father_name,
            motherName: studentDetails.mother_name,
            rollNumber: studentDetails.roll_no,
            registrationNo: studentDetails.registration_no || null,
            dateOfBirth: studentDetails.dob ? parseISO(studentDetails.dob) : new Date(),
            dateOfIssue: new Date(), // Default to current, will be user-editable in form
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
              theoryMarksObtained: mark.theory_marks_obtained ?? 0,
              practicalMarksObtained: mark.practical_marks_obtained ?? 0,
            })) || [],
          };
          setInitialData(transformedData);
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


  const processFormData = (data: MarksheetFormData): MarksheetDisplayData => {
    const subjectsDisplay: MarksheetSubjectDisplayEntry[] = data.subjects.map(s => {
      const obtainedTotal = (s.theoryMarksObtained || 0) + (s.practicalMarksObtained || 0);
      let subjectFailed = false;
      
      const theoryMarks = s.theoryMarksObtained;
      const practicalMarks = s.practicalMarksObtained;

      if (typeof theoryMarks === 'number' && theoryMarks < THEORY_PASS_THRESHOLD) {
        subjectFailed = true;
      }
      // Only check practical if theory hasn't already failed it.
      // And ensure practicalMarks exists and is a number.
      if (!subjectFailed && typeof practicalMarks === 'number' && practicalMarks < PRACTICAL_PASS_THRESHOLD) {
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

    return {
      ...data,
      system_id: data.system_id || studentSystemId,
      collegeCode: "53010",
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
      const { error: studentUpdateError } = await supabase
        .from('student_details')
        .update({
          name: data.studentName,
          father_name: data.fatherName,
          mother_name: data.motherName,
          roll_no: data.rollNumber,
          registration_no: data.registrationNo || null,
          dob: format(data.dateOfBirth, 'yyyy-MM-dd'),
          gender: data.gender,
          faculty: data.faculty,
          class: data.academicYear,
          academic_year: `${data.sessionStartYear}-${data.sessionEndYear}`,
        })
        .eq('id', studentSystemId); 

      if (studentUpdateError) throw studentUpdateError;

      const { error: deleteMarksError } = await supabase
        .from('student_marks_details')
        .delete()
        .eq('student_detail_id', studentSystemId); 

      if (deleteMarksError) throw deleteMarksError;

      if (data.subjects && data.subjects.length > 0) {
        const marksToInsert = data.subjects.map(subject => ({
          student_detail_id: studentSystemId, 
          subject_name: subject.subjectName,
          category: subject.category,
          max_marks: subject.totalMarks,
          theory_marks_obtained: subject.theoryMarksObtained,
          practical_marks_obtained: subject.practicalMarksObtained,
          obtained_total_marks: (subject.theoryMarksObtained || 0) + (subject.practicalMarksObtained || 0),
        }));
        const { error: insertMarksError } = await supabase.from('student_marks_details').insert(marksToInsert);
        if (insertMarksError) throw insertMarksError;
      }

      const processedData = processFormData(data);
      setMarksheetData(processedData);

      toast({
        title: 'Marksheet Updated Successfully',
        description: 'Student and marks data have been saved to the database. Previewing updated marksheet.',
      });
    } catch (error: any) {
      console.error("Error updating marksheet:", error);
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
