
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudentForm } from '@/components/app/student-form';
import { MarksheetDisplay } from '@/components/app/marksheet-display';
import type { StudentFormData, MarksheetData, MarksheetSubject } from '@/types';
import { generateFeedback, type GenerateFeedbackInput } from '@/ai/flows/generate-feedback';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function MarkMasterPage() {
  const [marksheetData, setMarksheetData] = useState<MarksheetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  // Effect to ensure client-side only rendering and check auth
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
    const checkAuthAndRedirect = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push('/login');
      } else {
        setIsAuthLoading(false);
      }
    };
    checkAuthAndRedirect();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);


  const handleGenerateMarksheet = async (formData: StudentFormData) => {
    setIsLoading(true);
    try {
      const subjectsWithFeedback: MarksheetSubject[] = await Promise.all(
        formData.subjects.map(async (subject) => {
          const percentage = (subject.marksObtained / subject.maxMarks) * 100;
          let feedbackText = 'Feedback generation is not available at the moment.';
          try {
            const feedbackInput: GenerateFeedbackInput = {
              studentName: formData.studentName,
              subject: subject.subjectName,
              marks: subject.marksObtained,
              maxMarks: subject.maxMarks,
            };
            const feedbackResult = await generateFeedback(feedbackInput);
            feedbackText = feedbackResult.feedback;
          } catch (error) {
            console.error(`Error generating feedback for ${subject.subjectName}:`, error);
            toast({
              title: "Feedback Error",
              description: `Could not generate feedback for ${subject.subjectName}.`,
              variant: "destructive",
            });
          }
          return {
            ...subject,
            percentage: isNaN(percentage) ? 0 : percentage,
            feedback: feedbackText,
          };
        })
      );

      const totalMarksObtained = subjectsWithFeedback.reduce((sum, sub) => sum + sub.marksObtained, 0);
      const totalMaxMarks = subjectsWithFeedback.reduce((sum, sub) => sum + sub.maxMarks, 0);
      const overallPercentageCalc = (totalMarksObtained / totalMaxMarks) * 100;
      const overallPercentage = isNaN(overallPercentageCalc) ? 0 : overallPercentageCalc;
      
      setMarksheetData({
        studentName: formData.studentName,
        studentId: formData.studentId,
        studentClass: formData.studentClass,
        subjects: subjectsWithFeedback,
        totalMarksObtained,
        totalMaxMarks,
        overallPercentage,
      });

    } catch (error) {
      console.error("Error processing marksheet:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while generating the marksheet.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setMarksheetData(null);
  };
  
  const handleLogout = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: 'Logout Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      // onAuthStateChange will handle redirect
    }
    setIsLoading(false);
  };


  if (!isClient || isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 md:px-6 md:py-12 min-h-screen flex flex-col items-center bg-background text-foreground">
      <header className="w-full mb-8 md:mb-12 text-center relative">
        <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
          MarkMaster
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Your Modern Marksheet Generator with AI Feedback
        </p>
         <Button 
          onClick={handleLogout} 
          variant="outline" 
          className="absolute top-0 right-0 mt-2 mr-2"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="animate-spin mr-2" /> : null} Logout
        </Button>
      </header>

      {isLoading && !marksheetData && ( // Show main loading spinner only if not displaying marksheet
        <div className="flex flex-col items-center justify-center space-y-4 p-8">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Generating marksheet, please wait...</p>
        </div>
      )}

      {!marksheetData && !isLoading && (
        <StudentForm onSubmit={handleGenerateMarksheet} isLoading={isLoading} />
      )}

      {marksheetData && ( // No !isLoading here so marksheet persists during logout loading
        <MarksheetDisplay data={marksheetData} onCreateNew={handleCreateNew} />
      )}
      
      <footer className="mt-auto pt-8 text-center text-sm text-muted-foreground print:hidden">
        <p>&copy; {new Date().getFullYear()} MarkMaster. All rights reserved.</p>
      </footer>
    </main>
  );
}
