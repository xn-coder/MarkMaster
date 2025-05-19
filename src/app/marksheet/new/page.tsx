
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
import Image from 'next/image';

export default function NewMarksheetPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [marksheetData, setMarksheetData] = useState<MarksheetDisplayData | null>(null);

  useEffect(() => {
    setIsClient(true);
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push('/login');
      } else {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const generateMarksheetNo = (faculty: string, rollNumber: string, sessionEndYear: number): string => {
    const facultyCode = faculty.substring(0, 2).toUpperCase();
    const month = format(new Date(), 'MMM').toUpperCase();
    // Simple sequence for now, can be improved
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
            overallResult = 'Fail'; // Fail if any subject is failed
            break;
        }
    }


    return {
      ...data,
      subjects: subjectsDisplay,
      marksheetNo: generateMarksheetNo(data.faculty, data.rollNumber, data.sessionEndYear),
      sessionDisplay: `${data.sessionStartYear}-${data.sessionEndYear}`,
      classDisplay: `${data.studentClass} (${data.section})`,
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
    // In a real app, you'd save this to a database
    // For now, we just process and display
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
    setMarksheetData(null); // Reset to show the form again
  };

  if (!isClient || isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="bg-secondary text-secondary-foreground py-3 shadow-sm print:hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Image
              src="https://placehold.co/50x50.png" 
              alt="College Logo"
              width={50}
              height={50}
              className="rounded-full"
              data-ai-hint="college logo"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-primary">
                SARYUG COLLEGE - MARKSHEET GENERATION
              </h1>
              <p className="text-xs text-muted-foreground">
                Student Result Management
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push('/')} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {!marksheetData ? (
          <MarksheetForm onSubmit={handleFormSubmit} isLoading={isLoading} />
        ) : (
          <MarksheetDisplay data={marksheetData} onCreateNew={handleCreateNew} />
        )}
      </main>

      <footer className="py-4 border-t border-border mt-auto print:hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground">
            <p>Copyright ©{new Date().getFullYear()} by Saryug College, Samastipur, Bihar. Design By Mantix.</p>
        </div>
      </footer>
    </div>
  );
}

    