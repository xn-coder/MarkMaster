
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { MarksheetForm } from '@/components/app/marksheet-form';
import { MarksheetDisplay } from '@/components/app/marksheet-display';
import type { MarksheetFormData, MarksheetDisplayData, MarksheetSubjectDisplayEntry } from '@/types';
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
      setIsLoadingData(true);

      const fetchStudentData = async () => {
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

          let sessionStartYear = new Date().getFullYear() - 1;
          let sessionEndYear = new Date().getFullYear();
          if (studentDetails.academic_year && studentDetails.academic_year.includes('-')) {
            const years = studentDetails.academic_year.split('-');
            sessionStartYear = parseInt(years[0], 10);
            sessionEndYear = parseInt(years[1], 10);
          }

          const transformedData: MarksheetFormData = {
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
    }
  }, [authStatus, studentSystemId, toast, router]);

  const generateMarksheetNo = useCallback((faculty: string, rollNumber: string, sessionEndYearNumber: number): string => {
    const facultyCode = faculty.substring(0, 2).toUpperCase();
    const month = format(new Date(), 'MMM').toUpperCase();
    const sequence = String(Math.floor(Math.random() * 900) + 100);
    return `${facultyCode}/${month}/${sessionEndYearNumber}/${rollNumber.slice(-3) || sequence}`;
  }, []);

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
      system_id: data.system_id || studentSystemId, 
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
          dob: format(data.dateOfBirth, 'yyyy-MM-dd'),
          gender: data.gender,
          faculty: data.faculty,
          class: data.academicYear,
          section: data.section,
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
          pass_marks: subject.passMarks,
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
  }

  if (authStatus === 'loading' || (authStatus === 'authenticated' && isLoadingData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background print:hidden">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{authStatus === 'loading' ? 'Verifying session...' : 'Loading student data...'}</p>
      </div>
    );
  }

  if (authStatus === 'authenticated' && !isLoadingData && !initialData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col print:h-full print:bg-white">
        <div className="print:hidden">
          <AppHeader pageSubtitle={defaultPageSubtitle} showBackButton={true} />
        </div>
        <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col items-center justify-center print:p-0 print:m-0 print:h-full print:container-none print:max-w-none max-w-screen-xl">
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col print:h-full print:bg-white">
      <div className="print:hidden">
        <AppHeader pageSubtitle={defaultPageSubtitle} showBackButton={true} />
      </div>

      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 print:p-0 print:m-0 print:h-full print:container-none print:max-w-none max-w-screen-xl">
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
