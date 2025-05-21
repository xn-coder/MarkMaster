
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
  pageSubtitle?: string | React.ReactNode;
}

export function AppHeader({
  pageTitle = "SARYUG COLLEGE",
  pageSubtitle,
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

  const renderSubtitle = () => {
    if (!pageSubtitle) return null;
    if (typeof pageSubtitle === 'string') {
      const lines = pageSubtitle.split('\n');
      return lines.map((line, index) => {
        if (line.trim().toLowerCase() === 'www.saryugcollege.com') {
          return (
            <p key={index} className="text-xs text-muted-foreground">
              <a
                href="http://www.saryugcollege.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {line}
              </a>
            </p>
          );
        }
        return (
          <p key={index} className="text-xs text-muted-foreground">
            {line}
          </p>
        );
      });
    }
    return pageSubtitle;
  };

  return (
    <header className="bg-secondary text-secondary-foreground py-3 shadow-sm print:hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between max-w-screen-xl">
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Logo is always the leftmost item now */}
          <Image
            src="/college-logo.png"
            alt="College Logo"
            width={80}
            height={80}
            className="rounded-full"
            data-ai-hint="college logo"
          />
        </div>

        <div className="text-center mx-4 flex-grow">
          <h1 className="text-lg sm:text-xl font-bold text-primary">
            {pageTitle}
          </h1>
          {renderSubtitle()}
        </div>

        <div className="flex-shrink-0">
          <Button variant="default" onClick={handleLogout} disabled={isLoggingOut} size="sm">
            {isLoggingOut ? <Loader2 className="animate-spin h-4 w-4" /> : <LogOut className="mr-2 h-4 w-4" />} Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
