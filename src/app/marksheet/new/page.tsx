
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
// Removed import for useLoadingIndicator

const defaultPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

export default function NewMarksheetPage() {
  const router = useRouter();
  const { toast } = useToast();
  // Removed showLoader, hideLoader from useLoadingIndicator

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
      // hideLoader();
    } else if (authStatus === 'authenticated') {
      setFooterYear(new Date().getFullYear());
      // hideLoader();
    }
  }, [authStatus, router]);


  const processFormData = (data: MarksheetFormData, systemId: string): MarksheetDisplayData => {
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

    return {
      ...data,
      system_id: systemId,
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
      registrationNo: data.registrationNo || '',
    };
  };

  const handleFormSubmit = async (data: MarksheetFormData) => {
    setIsLoadingFormSubmission(true);

    const academicSessionString = `${data.sessionStartYear}-${data.sessionEndYear}`;
    const systemGeneratedId = crypto.randomUUID();

    const { data: existingStudentCheck, error: checkError } = await supabase
      .from('student_details')
      .select('id')
      .eq('roll_no', data.rollNumber)
      .eq('academic_year', academicSessionString)
      .eq('class', data.academicYear)
      .eq('faculty', data.faculty)
      .eq('registration_no', data.registrationNo || null)
      .maybeSingle();

    if (checkError) {
      toast({
        title: 'Database Error',
        description: `Failed to check for existing student: ${checkError.message}`,
        variant: 'destructive',
      });
      setIsLoadingFormSubmission(false);
      return;
    }

    if (existingStudentCheck) {
      toast({
        title: 'Student Already Exists',
        description: 'A student with the same Roll No., Registration No., Academic Session, Class, and Faculty already exists.',
        variant: 'destructive',
      });
      setIsLoadingFormSubmission(false);
      return;
    }

    try {
      const dobFormatted = format(data.dateOfBirth, 'yyyy-MM-dd');

      const studentToInsert = {
        id: systemGeneratedId,
        roll_no: data.rollNumber,
        name: data.studentName,
        father_name: data.fatherName,
        mother_name: data.motherName,
        dob: dobFormatted,
        gender: data.gender,
        registration_no: data.registrationNo || null,
        faculty: data.faculty,
        class: data.academicYear,
        academic_year: academicSessionString,
      };

      const { data: insertedStudentData, error: studentError } = await supabase
        .from('student_details')
        .insert(studentToInsert)
        .select()
        .single();

      if (studentError || !insertedStudentData) {
        console.error('Error inserting student:', studentError);
        toast({
          title: 'Database Error',
          description: `Failed to save student data: ${studentError?.message || 'Unknown error.'}`,
          variant: 'destructive',
        });
        setIsLoadingFormSubmission(false);
        return;
      }

      const subjectMarksToInsert = data.subjects.map(subject => ({
        student_detail_id: insertedStudentData.id,
        subject_name: subject.subjectName,
        category: subject.category,
        max_marks: subject.totalMarks,
        pass_marks: subject.passMarks,
        theory_marks_obtained: subject.theoryMarksObtained,
        practical_marks_obtained: subject.practicalMarksObtained,
        obtained_total_marks: (subject.theoryMarksObtained || 0) + (subject.practicalMarksObtained || 0),
      }));

      if (subjectMarksToInsert.length > 0) {
        const { error: subjectMarksError } = await supabase
          .from('student_marks_details')
          .insert(subjectMarksToInsert);

        if (subjectMarksError) {
          console.error('Error inserting subject marks:', subjectMarksError);
          await supabase.from('student_details').delete().eq('id', insertedStudentData.id);
          toast({
            title: 'Database Error',
            description: `Failed to save subject marks: ${subjectMarksError.message}. Student data was not saved.`,
            variant: 'destructive',
          });
          setIsLoadingFormSubmission(false);
          return;
        } else {
          toast({
            title: 'Marksheet Data Saved',
            description: 'Student and subject data successfully saved to the database.',
          });
        }
      } else {
         toast({
            title: 'Student Data Saved (No Subjects)',
            description: 'Student data saved, but no subjects were provided to save.',
            variant: 'default'
        });
      }

      const processedDataForDisplay = processFormData(data, insertedStudentData.id);
      setMarksheetData(processedDataForDisplay);

    } catch (error) {
      console.error("Error processing or saving marksheet:", error);
      let message = 'An unexpected error occurred while saving or processing the marksheet.';
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: 'Operation Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingFormSubmission(false);
    }
  };

  const handleCreateNew = () => {
    setMarksheetData(null);
  };

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
