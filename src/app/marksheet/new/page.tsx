
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

export default function NewMarksheetPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [isClient, setIsClient] = useState(false);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  
  const [isLoading, setIsLoading] = useState(false); 
  const [marksheetData, setMarksheetData] = useState<MarksheetDisplayData | null>(null);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      setFooterYear(new Date().getFullYear());
    }
  }, [isClient]);

  useEffect(() => {
    if (!isClient) {
      return; 
    }

    const checkAuthentication = async () => {
      setAuthStatus('loading'); 
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
  }, [isClient]); 

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
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
    setIsLoading(true);
    try {
      const processedData = processFormData(data);
      setMarksheetData(processedData);
      toast({
        title: 'Marksheet Generated',
        description: 'Previewing the marksheet.',
      });
    } catch (error) {
      console.error("Error processing marksheet:", error);
      toast({
        title: 'Error',
        description: 'Could not process marksheet data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setMarksheetData(null); 
  };

  if (!isClient || authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader 
        pageTitle="Create New Marksheet" // More specific title for this page
        pageSubtitle="Enter Student and Subject Details" // More specific subtitle
        customRightContent={
          <Button variant="outline" onClick={() => router.push('/')} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        }
      />
      
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {!marksheetData ? (
          <MarksheetForm onSubmit={handleFormSubmit} isLoading={isLoading} />
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
