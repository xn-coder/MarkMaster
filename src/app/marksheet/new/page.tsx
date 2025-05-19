
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

const defaultPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

export default function NewMarksheetPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  
  const [isLoadingFormSubmission, setIsLoadingFormSubmission] = useState(false); 
  const [marksheetData, setMarksheetData] = useState<MarksheetDisplayData | null>(null);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Authentication error on new marksheet page:", error.message);
        setAuthStatus('unauthenticated'); 
      } else if (!session) {
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
       // Set footer year only on client-side after authentication
      setFooterYear(new Date().getFullYear()); 
    }
  }, [authStatus, router]);


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
    const processedDataForDisplay = processFormData(data); // Process for display first

    try {
      // 1. Insert student data
      // Ensure dateOfBirth is in 'YYYY-MM-DD' format for Supabase 'date' type
      const dobFormatted = format(data.dateOfBirth, 'yyyy-MM-dd');

      const studentToInsert = {
        student_id: data.rollNumber, // Assuming rollNumber is the student_id (PK)
        name: data.studentName,
        father_name: data.fatherName,
        mother_name: data.motherName,
        roll_no: data.rollNumber, 
        dob: dobFormatted,
        gender: data.gender,
        faculty: data.faculty,
        class: data.academicYear, // Form's academicYear (e.g., "11th") maps to DB 'class'
        section: data.section,
        academic_year: `${data.sessionStartYear}-${data.sessionEndYear}`, // Form session maps to DB 'academic_year'
      };

      const { data: insertedStudent, error: studentError } = await supabase
        .from('students')
        .insert(studentToInsert)
        .select()
        .single();

      if (studentError) {
        console.error('Error inserting student:', studentError);
        toast({
          title: 'Database Error',
          description: `Failed to save student data: ${studentError.message}`,
          variant: 'destructive',
        });
        setIsLoadingFormSubmission(false);
        return;
      }

      if (!insertedStudent) {
         console.error('Student data was not returned after insert.');
        toast({
          title: 'Database Error',
          description: 'Failed to save student data (no record returned). Please check database logs.',
          variant: 'destructive',
        });
        setIsLoadingFormSubmission(false);
        return;
      }
      
      // 2. Prepare and insert subject marks data
      const subjectMarksToInsert = data.subjects.map(subject => ({
        student_id: insertedStudent.student_id, // Use the PK from the inserted student record
        subject_name: subject.subjectName,
        category: subject.category,
        max_marks: subject.totalMarks,
        pass_marks: subject.passMarks,
        theory_marks_obtained: subject.theoryMarksObtained,
        practical_marks_obtained: subject.practicalMarksObtained,
        obtained_total_marks: (subject.theoryMarksObtained || 0) + (subject.practicalMarksObtained || 0),
      }));

      const { error: subjectMarksError } = await supabase
        .from('subject_marks')
        .insert(subjectMarksToInsert);

      if (subjectMarksError) {
        console.error('Error inserting subject marks:', subjectMarksError);
        // Potentially try to delete the student record if subjects fail (complex, consider for later)
        toast({
          title: 'Database Error',
          description: `Failed to save subject marks: ${subjectMarksError.message}. Student data was saved, but subjects were not.`,
          variant: 'destructive',
        });
        // Still proceed to show preview, but with error context
      } else {
        toast({
          title: 'Marksheet Data Saved',
          description: 'Student and subject data successfully saved to the database.',
        });
      }
      
      // Proceed to show preview whether DB save was partial or full success
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

  if (authStatus === 'unauthenticated') {
    // This should ideally not be reached if useEffect redirects, but as a fallback:
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

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
      
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground">
            {footerYear && <p>Copyright ©{footerYear} by Saryug College, Samastipur, Bihar. Design By Mantix.</p>}
            {!footerYear && <p>Copyright by Saryug College, Samastipur, Bihar. Design By Mantix.</p>}
        </div>
      </footer>
    </div>
  );
}

