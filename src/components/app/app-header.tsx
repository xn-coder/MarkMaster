
'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';
import React, { useState } from 'react';

interface AppHeaderProps {
  pageTitle?: string;
  pageSubtitle?: string;
  customRightContent?: React.ReactNode; 
}

export function AppHeader({
  pageTitle = "SARYUG COLLEGE",
  pageSubtitle = "Affiliated By Bihar School Examination Board | [Estd. - 1983]\n[College Code: 53010]",
  customRightContent,
}: AppHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: 'Logout Failed', description: error.message, variant: 'destructive' });
      setIsLoggingOut(false);
    } else {
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login');
    }
  };

  const subtitleLines = pageSubtitle.split('\n');

  const defaultRightContent = (
    <Button variant="default" onClick={handleLogout} disabled={isLoggingOut} size="sm">
      {isLoggingOut ? <Loader2 className="animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />} Logout
    </Button>
  );

  return (
    <header className="bg-secondary text-secondary-foreground py-3 shadow-sm print:hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Image
            src="/college-logo.png" 
            alt="College Logo"
            width={50}
            height={50}
            className="rounded-full"
            data-ai-hint="college logo"
          />
        </div>

        {/* Middle: College Name/Details */}
        <div className="text-center mx-4 flex-grow">
          <h1 className="text-lg sm:text-xl font-bold text-primary">
            {pageTitle}
          </h1>
          {subtitleLines.map((line, index) => (
            <p key={index} className="text-xs text-muted-foreground">
              {line}
            </p>
          ))}
        </div>

        {/* Right: Action Button */}
        <div className="flex-shrink-0">
          {customRightContent !== undefined ? customRightContent : defaultRightContent}
        </div>
      </div>
    </header>
  );
}
