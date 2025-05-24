'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client'; // KEEP for AUTH
import { MarksheetDisplay } from '@/components/app/marksheet-display';
import type { MarksheetDisplayData } from '@/types'; // Only MarksheetDisplayData needed here
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';


// IMPORT SERVER ACTION
import {
  fetchMarksheetForDisplayAction,
  type FetchMarksheetForDisplayResult // Optional for type safety
} from '@/app/admin/actions'; // Adjust path if needed

const defaultPageSubtitle = `(Affiliated By Bihar School Examination Board, Patna)
[Estd. - 1983] College Code: 53010
Chitragupta Nagar, Mohanpur, Samastipur, Bihar - 848101
www.saryugcollege.com`;

export default function ViewMarksheetPage() {
  const router = useRouter();
  const params = useParams();
  const studentSystemId = params.studentId as string; 
  const { toast } = useToast();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [marksheetData, setMarksheetData] = useState<MarksheetDisplayData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
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

      const loadMarksheetData = async () => {
        try {
          // CALL SERVER ACTION TO FETCH AND PROCESS DATA
          const result: FetchMarksheetForDisplayResult = await fetchMarksheetForDisplayAction(studentSystemId);

          if (result.success && result.data) {
            setMarksheetData(result.data);
          } else {
            toast({ title: 'Error', description: result.message || `Marksheet data not found for ID: ${studentSystemId}.`, variant: 'destructive' });
            setMarksheetData(null);
          }
        } catch (error) {
          console.error("Error fetching marksheet data for view (client):", error);
          toast({ title: 'Fetch Error', description: 'Could not load marksheet data.', variant: 'destructive' });
          setMarksheetData(null);
        } finally {
          setIsLoadingData(false);
        }
      };

      loadMarksheetData();
    }
  }, [authStatus, studentSystemId, toast, router]);

  // --- LOADING AND ERROR STATES (NO MAJOR CHANGE, BUT DRIVEN BY NEW DATA FLOW) ---
  if (authStatus === 'loading' || (authStatus === 'authenticated' && isLoadingData)) {
    // ... (Loading JSX - no change)
    return (
      <div className="flex items-center justify-center min-h-screen bg-background print:hidden">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{authStatus === 'loading' ? 'Verifying session...' : 'Loading marksheet data...'}</p>
      </div>
    );
  }

  if (authStatus === 'authenticated' && !isLoadingData && !marksheetData) {
    // ... (Not Found JSX - no change)
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
          </div>
        </footer>
      </div>
    );
  }
  
  // --- REMAINDER OF THE COMPONENT (JSX) - NO SIGNIFICANT CHANGES NEEDED ---
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
        {marksheetData ? (
          <MarksheetDisplay data={marksheetData} />
        ) : (
          // This case should ideally be covered by the "Not Found" state above
          // if isLoadingData is false and marksheetData is null.
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