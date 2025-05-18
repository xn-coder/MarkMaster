
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

type View = 'signIn' | 'forgotPassword' | 'resetPasswordForm';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [view, setView] = useState<View>('signIn');
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const emailFromEnv = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (emailFromEnv) {
      setAdminEmail(emailFromEnv);
    } else {
      console.warn('NEXT_PUBLIC_ADMIN_EMAIL is not set in .env file');
      toast({
        title: 'Configuration Error',
        description: 'Admin email is not configured. Please contact support.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // This event is triggered when the user clicks the recovery link
        // and is redirected back to this page.
        setView('resetPasswordForm');
        toast({
          title: 'Password Recovery',
          description: 'Please enter your new password.',
        });
      } else if (event === 'SIGNED_IN') {
        router.push('/');
      }
    });

    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/');
      }
    };
    checkUser();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, toast]);


  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password,
    });
    if (error) {
      toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Login Successful', description: 'Redirecting...' });
      // onAuthStateChange will handle redirect
    }
    setLoading(false);
  };

  const handleForgotPasswordRequest = async () => {
    if (!adminEmail) {
       toast({ title: 'Error', description: 'Admin email is not configured.', variant: 'destructive' });
       return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(adminEmail, {
      redirectTo: window.location.origin + '/login', // Redirect back to login page to handle recovery
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'Password reset instructions have been sent.' });
      setView('signIn'); // Go back to sign in view, user will click link from email
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: 'Password Reset Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password Reset Successful', description: 'You can now login with your new password.' });
      setNewPassword('');
      setView('signIn');
    }
    setLoading(false);
  };
  
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-white shadow-md">
        <div className="container mx-auto flex items-center justify-between py-3 px-4 sm:px-6 lg:px-8 h-auto md:h-24">
          <div className="flex-shrink-0">
            <Image
              src="https://placehold.co/50x50.png"
              alt="College Logo"
              width={50}
              height={50}
              className="rounded-full"
              data-ai-hint="college logo"
            />
          </div>
          <div className="text-center mx-2 sm:mx-4 flex-grow">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-indigo-700 leading-tight">
              SARYUG COLLEGE, CHITRAGUPT NAGAR, MOHANPUR SAMASTIPUR BIHAR
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm text-slate-600 mt-0.5">
              Affiled By Bihar School Examination Board | [Estd. - 1983]
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500">53010</p>
          </div>
          <div className="flex-shrink-0">
            <Image
              src="https://placehold.co/40x40.png"
              alt="User Icon"
              width={40}
              height={40}
              className="rounded-full"
              data-ai-hint="profile avatar"
            />
          </div>
        </div>
      </header>

      <main className="flex-grow relative flex items-center justify-center">
        <Image
          src="https://placehold.co/1920x1080.png"
          alt="Login background"
          layout="fill"
          objectFit="cover"
          className="absolute inset-0 -z-10"
          data-ai-hint="laptop desk"
          priority
        />
        <div className="bg-slate-800 bg-opacity-80 backdrop-blur-sm p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md m-4 z-10">
          {view === 'signIn' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-white mb-1 block">Email address</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={adminEmail}
                  readOnly
                  className="bg-slate-200 text-slate-700 cursor-not-allowed placeholder-slate-500 border-slate-300 focus:ring-primary focus:border-primary text-sm h-11"
                />
              </div>
              <div>
                <Label htmlFor="password"className="text-white mb-1 block">Password</Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white text-slate-900 placeholder-slate-500 border-slate-300 focus:ring-primary focus:border-primary text-sm h-11"
                  autoComplete="current-password"
                />
              </div>
              <div className="flex items-center justify-between flex-wrap gap-y-2">
                <div className="flex items-center">
                  <Checkbox
                    id="keep-signed-in"
                    name="keep-signed-in"
                    className="h-4 w-4 text-primary border-slate-400 bg-white focus:ring-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                  />
                  <Label htmlFor="keep-signed-in" className="ml-2 block text-xs sm:text-sm text-white font-normal">
                    Keep me signed in
                  </Label>
                </div>
                <div className="text-xs sm:text-sm">
                  <Button variant="link" type="button" onClick={() => setView('forgotPassword')} className="font-medium text-white hover:text-blue-300 p-0 h-auto">
                    Forgot password?
                  </Button>
                </div>
              </div>
              <div>
                <Button type="submit" className="w-full py-3 px-4 text-sm font-medium" disabled={loading || !adminEmail}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : null} Login
                </Button>
              </div>
            </form>
          )}

          {view === 'forgotPassword' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white text-center">Forgot Password</h2>
              <p className="text-sm text-slate-300 text-center">Enter the admin email address to receive password reset instructions.</p>
              <div>
                <Label htmlFor="reset-email" className="text-white mb-1 block">Admin Email</Label>
                <Input
                  type="email"
                  id="reset-email"
                  value={adminEmail}
                  readOnly
                  className="bg-slate-200 text-slate-700 cursor-not-allowed placeholder-slate-500 border-slate-300 focus:ring-primary focus:border-primary text-sm h-11"
                />
              </div>
              <Button onClick={handleForgotPasswordRequest} className="w-full py-3" disabled={loading || !adminEmail}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : null} Send Reset Instructions
              </Button>
              <Button variant="outline" onClick={() => setView('signIn')} className="w-full py-3 text-white border-white hover:bg-white hover:text-slate-800">
                Back to Login
              </Button>
            </div>
          )}
          
          {view === 'resetPasswordForm' && (
             <form onSubmit={handleResetPassword} className="space-y-6">
              <h2 className="text-xl font-semibold text-white text-center">Reset Your Password</h2>
               <div>
                 <Label htmlFor="new-password"className="text-white mb-1 block">New Password</Label>
                 <Input
                   type="password"
                   id="new-password"
                   value={newPassword}
                   onChange={(e) => setNewPassword(e.target.value)}
                   required
                   placeholder="Enter new password"
                   className="bg-white text-slate-900 placeholder-slate-500 border-slate-300 focus:ring-primary focus:border-primary text-sm h-11"
                 />
               </div>
               <Button type="submit" className="w-full py-3" disabled={loading}>
                 {loading ? <Loader2 className="animate-spin mr-2" /> : null} Reset Password
               </Button>
                <Button variant="outline" onClick={() => setView('signIn')} className="w-full py-3 text-white border-white hover:bg-white hover:text-slate-800">
                Back to Login
              </Button>
             </form>
           )}

        </div>
      </main>

      <footer className="bg-white py-4 shadow-sm">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 px-4 sm:px-6 lg:px-8">
          <p className="mb-2 sm:mb-0 text-center sm:text-left">Copyright ©2025 by Saryug College, Samastipur, Bihar</p>
          <p className="text-center sm:text-right">Design By Mantix</p>
        </div>
      </footer>
    </div>
  );
}
