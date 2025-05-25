'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client'; // KEEP for AUTHENTICATION ONLY
import { MarksheetDisplay } from '@/components/app/marksheet-display';
import type { MarksheetFormData, MarksheetDisplayData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns'; // parseISO might not be strictly needed if dates are already Date objects from server action
import { AppHeader } from '@/components/app/app-header';
import { numberToWords } from '@/lib/utils';
// Assuming ACADEMIC_YEAR_OPTIONS is defined in types.ts or a constants file and imported as a type
import type { ACADEMIC_YEAR_OPTIONS } from '@/components/app/marksheet-form-schema';

// IMPORT SERVER ACTIONS for MySQL data interaction
import {
  fetchMarksheetForDisplayAction, // Fetches processed data directly from MySQL
  type FetchMarksheetForDisplayResult // For type safety of the result from fetchMarksheetForDisplayAction
} from '@/app/admin/actions'; // Adjust path if needed

const defaultPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

// These thresholds are primarily used for client-side processing,
// but the server action for display already calculates `isFailed` based on these,
// so they are less critical here for display logic.
const THEORY_PASS_THRESHOLD = 30;
const PRACTICAL_PASS_THRESHOLD = 33;

export default function ViewMarksheetPage() {
  const router = useRouter();
  const params = useParams();
  const studentSystemId = params.studentId as string;
  const { toast } = useToast();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [marksheetData, setMarksheetData] = useState<MarksheetDisplayData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [footerYear, setFooterYear] = useState<number | null>(null);

  // --- AUTHENTICATION LOGIC (No change - uses client-side Supabase) ---
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          setAuthStatus('unauthenticated');
        } else {
          setAuthStatus('authenticated');
        }
      } catch (e: any) {
        console.error("Exception during auth check:", e);
        toast({ title: 'Authentication Error', description: e.message || 'Failed to check session.', variant: 'destructive' });
        setAuthStatus('unauthenticated');
      }
    };
    checkAuthentication();
  }, [toast]);

  // --- DATA FETCHING LOGIC (MODIFIED to use Server Action for display data) ---
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated' && studentSystemId) {
      setFooterYear(new Date().getFullYear());
      
      const fetchAndSetMarksheetData = async () => {
        setIsLoadingData(true);
        try {
          // CALL THE SERVER ACTION TO FETCH ALREADY PROCESSED DATA FROM MYSQL
          // The server action 'fetchMarksheetForDisplayAction' already includes all calculation
          // logic and returns data in MarksheetDisplayData format.
          const result: FetchMarksheetForDisplayResult = await fetchMarksheetForDisplayAction(studentSystemId);

          if (result.success && result.data) {
            setMarksheetData(result.data);
            toast({ title: 'Marksheet Data Loaded', description: 'Marksheet loaded successfully for viewing.' });
          } else {
            console.log(result.message);
            toast({ 
                title: 'Error Loading Marksheet', 
                description: result.message || `Marksheet data not found for ID: ${studentSystemId}.`, 
                variant: 'destructive' 
            });
            setMarksheetData(null);
            // Optionally redirect if data not found, or show a specific message
            router.push('/'); // Redirect to dashboard or home if student not found/marksheet not found
          }
        } catch (error: any) {
          console.error("Error fetching marksheet data for view:", error);
          toast({ title: 'Fetch Error', description: `Could not load marksheet data: ${error.message || 'Unknown error'}`, variant: 'destructive' });
          setMarksheetData(null);
        } finally {
          setIsLoadingData(false);
        }
      }; // End of fetchAndSetMarksheetData function
      fetchAndSetMarksheetData(); // Call the function
    } else if (authStatus === 'authenticated' && !studentSystemId) {
        toast({ title: 'Error', description: 'No student ID provided for viewing.', variant: 'destructive' });
        setIsLoadingData(false);
        router.push('/');
    }
  }, [authStatus, studentSystemId, toast, router]);

  // --- Navigation Logic (No change) ---
  const handleNavigateToEdit = useCallback((id: string) => {
    router.push(`/marksheet/edit/${id}`);
  }, [router]);


  // --- LOADING AND ERROR STATES (No functional change) ---
  if (authStatus === 'loading' || (authStatus === 'authenticated' && isLoadingData && !marksheetData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background print:hidden">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{authStatus === 'loading' ? 'Verifying session...' : 'Loading marksheet data...'}</p>
      </div>
    );
  }
  
  if (authStatus === 'authenticated' && !isLoadingData && !marksheetData && studentSystemId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col print:h-full print:bg-white">
        <div className="print:hidden">
          <AppHeader pageSubtitle={defaultPageSubtitle} />
        </div>
        <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col items-center justify-center print:p-0 print:m-0 print:h-full print:container-none print:max-w-none max-w-screen-xl">
          <div className="flex justify-start w-full mb-6 print:hidden">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
          </div>
          <h1 className="text-2xl font-bold text-destructive mb-4">Marksheet Not Found</h1>
          <p className="text-muted-foreground mb-6 text-center">The marksheet data for student ID '{studentSystemId}' could not be loaded. <br /> Please check the ID or ensure the student and their marks exist in the database.</p>
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

  // --- MAIN RENDER LOGIC (No functional change) ---
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col print:h-full print:bg-white">
      <div className="print:hidden">
        <AppHeader pageSubtitle={defaultPageSubtitle} />
      </div>

      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 print:p-0 print:m-0 print:h-full print:container-none print:max-w-none max-w-screen-xl">
        <div className="flex justify-start w-full mb-6 print:hidden">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        </div>
        {marksheetData ? (
          <MarksheetDisplay 
            data={marksheetData} 
            // `onEditBack` is not needed for a View page, instead provide `onNavigateToEdit`
            onNavigateToEdit={studentSystemId ? () => handleNavigateToEdit(studentSystemId) : undefined}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)] print:hidden">
            <p className="text-muted-foreground">No marksheet data to display.</p>
          </div>
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