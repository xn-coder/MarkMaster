'use client';

import React, { useState, useEffect } from 'react';
import { StudentForm } from '@/components/app/student-form';
import { MarksheetDisplay } from '@/components/app/marksheet-display';
import type { StudentFormData, MarksheetData, MarksheetSubject } from '@/types';
import { generateFeedback, type GenerateFeedbackInput } from '@/ai/flows/generate-feedback';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

export default function MarkMasterPage() {
  const [marksheetData, setMarksheetData] = useState<MarksheetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Effect to ensure client-side only rendering for this component
  // Helps avoid potential hydration mismatches if any browser-specific APIs were used
  // or if initial state relied on something not available at build time.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);


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

  if (!isClient) {
    // Render nothing or a basic loading state on the server to prevent hydration issues
    // Or, if the page is entirely client-rendered, this ensures no mismatch.
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 md:px-6 md:py-12 min-h-screen flex flex-col items-center bg-background text-foreground">
      <header className="mb-8 md:mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
          MarkMaster
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Your Modern Marksheet Generator with AI Feedback
        </p>
      </header>

      {isLoading && (
        <div className="flex flex-col items-center justify-center space-y-4 p-8">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Generating marksheet, please wait...</p>
        </div>
      )}

      {!marksheetData && !isLoading && (
        <StudentForm onSubmit={handleGenerateMarksheet} isLoading={isLoading} />
      )}

      {marksheetData && !isLoading && (
        <MarksheetDisplay data={marksheetData} onCreateNew={handleCreateNew} />
      )}
      
      <footer className="mt-auto pt-8 text-center text-sm text-muted-foreground print:hidden">
        <p>&copy; {new Date().getFullYear()} MarkMaster. All rights reserved.</p>
      </footer>
    </main>
  );
}
