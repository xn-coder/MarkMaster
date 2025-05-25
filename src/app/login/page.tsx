
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

type View = 'signIn' | 'forgotPasswordRequestOtp' | 'verifyOtp' | 'resetPasswordForm';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [view, setView] = useState<View>('signIn');
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const adminUserCheckPerformed = useRef(false);

  const ensureAdminUserExists = useCallback(async (emailToEnsure: string) => {
    if (!emailToEnsure || !emailToEnsure.includes('@')) {
      console.error("ensureAdminUserExists called with invalid or no email:", emailToEnsure);
      return;
    }
    console.log(`ensureAdminUserExists: Attempting to sign up or confirm user: ${emailToEnsure}`);

    const { data, error } = await supabase.auth.signUp({
      email: emailToEnsure,
      password: 'password', // Default password
    });

    if (error) {
      console.error("Supabase signUp error in ensureAdminUserExists:", error);
      if (
        error.message.toLowerCase().includes('user already registered') ||
        error.message.toLowerCase().includes('user already exists') ||
        (error.message.toLowerCase().includes('email link') && error.message.toLowerCase().includes('already been sent')) ||
        error.message.toLowerCase().includes('rate limit exceeded')
      ) {
        toast({
          title: 'Admin User Info',
          description: `Admin user with email ${emailToEnsure} already exists or setup process initiated. If you recently created this user, check your email for confirmation if required by your Supabase settings.`,
          variant: 'default',
        });
      } else {
        toast({ title: 'Admin User Setup Error', description: `Could not ensure admin user. Supabase error: ${error.message}`, variant: 'destructive' });
      }
    } else if (data.user) {
      toast({
        title: 'Admin User Setup Successful',
        description: `Admin user ${emailToEnsure} ensured. If newly created and email confirmation is enabled in Supabase, please check your email.`,
      });
    } else if (data.session === null && !data.user && !error) {
       toast({
        title: 'Admin User Awaiting Confirmation',
        description: `Admin user ${emailToEnsure} may be awaiting email confirmation. Please check your inbox.`,
        variant: 'default',
       });
    }
  }, [toast]);

  useEffect(() => {
    setIsClient(true);
    const rawEmailFromEnv = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    console.log("Login Page Mount: Raw NEXT_PUBLIC_ADMIN_EMAIL from env:", rawEmailFromEnv);

    const emailFromEnv = rawEmailFromEnv?.trim();
    console.log("Login Page Mount: Trimmed emailFromEnv:", emailFromEnv);

    if (emailFromEnv && emailFromEnv.includes('@')) {
      setAdminEmail(emailFromEnv);
      if (!adminUserCheckPerformed.current) {
        console.log("Login Page Mount: Attempting to ensure admin user exists with email:", emailFromEnv);
        ensureAdminUserExists(emailFromEnv);
        adminUserCheckPerformed.current = true;
      }
    } else {
      console.warn('NEXT_PUBLIC_ADMIN_EMAIL is not set or is invalid in .env file. Raw value:', rawEmailFromEnv);
      toast({
        title: 'Configuration Error',
        description: 'Admin email (NEXT_PUBLIC_ADMIN_EMAIL) is not configured correctly in your .env file or is missing. Please ensure it is a valid email address and restart the server.',
        variant: 'destructive',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && view !== 'resetPasswordForm' && view !== 'verifyOtp') {
        router.push('/');
      }
    });

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && view !== 'resetPasswordForm' && view !== 'verifyOtp' && view !== 'forgotPasswordRequestOtp' ) {
        router.push('/');
      }
    };

    if(isClient){
        checkUser();
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, view, isClient]);


  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    console.log("Attempting login with email:", adminEmail);
    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password,
    });
    if (error) {
      toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Login Successful', description: 'Redirecting...' });
    }
    setLoading(false);
  };

  const handleRequestOtp = async () => {
    if (!adminEmail) {
       toast({ title: 'Error', description: 'Admin email is not configured.', variant: 'destructive' });
       return;
    }
    setLoading(true);
    console.log("Requesting OTP for email:", adminEmail);
    const { error } = await supabase.auth.signInWithOtp({
      email: adminEmail,
      options: {
        shouldCreateUser: false, 
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : '',
      }
    });

    if (error) {
      toast({ title: 'Error Sending OTP', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'OTP Sent', description: `An OTP has been sent to ${adminEmail}.` });
      setView('verifyOtp');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adminEmail || !otp) {
      toast({ title: 'Error', description: 'Email or OTP missing.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    console.log("Verifying OTP for email:", adminEmail);
    const { data, error } = await supabase.auth.verifyOtp({
      email: adminEmail,
      token: otp,
      type: 'email', 
    });

    if (error) {
      toast({ title: 'OTP Verification Failed', description: error.message, variant: 'destructive' });
    } else if (data.session) {
      toast({ title: 'OTP Verified', description: 'Please set your new password.' });
      setView('resetPasswordForm');
    } else {
      toast({ title: 'OTP Verification Failed', description: 'Invalid OTP or an unexpected issue occurred.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPassword) {
      toast({ title: 'Error', description: 'New password cannot be empty.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    console.log("Resetting password for current user (identified by OTP session)");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: 'Password Reset Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password Reset Successful', description: 'You can now login with your new password.' });
      setNewPassword('');
      await supabase.auth.signOut();
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
      <header className="bg-white shadow-md py-3">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between max-w-screen-xl">
          <div className="flex items-center flex-shrink-0 gap-3">
            <Image
              src="/college-logo.png"
              alt="College Logo"
              width={80} 
              height={80} 
              className="rounded-full"
              data-ai-hint="college logo"
            />
          </div>
          <div className="text-center mx-2 sm:mx-4 flex-grow">
            <h1 
              className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold leading-tight"
              style={{ color: '#032781' }}
            >
              SARYUG COLLEGE, CHITRAGUPT NAGAR, MOHANPUR SAMASTIPUR BIHAR
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm text-slate-600 mt-0.5">
              Affiled By Bihar School Examination Board | [Estd. - 1983]
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500">College Code: 53010</p>
          </div>
          <div className="flex-shrink-0">
            <Image
              src="/person.png"
              alt="User Icon"
              width={70}
              height={70}
              className="rounded-full"
              data-ai-hint="profile avatar"
            />
          </div>
        </div>
      </header>

      <main 
        className="flex-grow relative flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      >
        
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
                  placeholder="password"
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
                  <Button variant="link" type="button" onClick={() => setView('forgotPasswordRequestOtp')} className="font-medium text-white hover:text-blue-300 p-0 h-auto">
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

          {view === 'forgotPasswordRequestOtp' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white text-center">Forgot Password</h2>
              <p className="text-sm text-slate-300 text-center">Enter the admin email address to receive an OTP for password reset.</p>
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
              <Button onClick={handleRequestOtp} className="w-full py-3" disabled={loading || !adminEmail}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : null} Send OTP
              </Button>
              <Button variant="outline" onClick={() => setView('signIn')} className="w-full py-3 text-blue-300 border-blue-300 hover:bg-blue-300 hover:text-slate-800">
                Back to Login
              </Button>
            </div>
          )}

          {view === 'verifyOtp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <h2 className="text-xl font-semibold text-white text-center">Verify OTP</h2>
              <p className="text-sm text-slate-300 text-center">An OTP has been sent to {adminEmail}. Please enter it below.</p>
              <div>
                <Label htmlFor="otp"className="text-white mb-1 block">One-Time Password (OTP)</Label>
                <Input
                  type="text"
                  id="otp"
                  name="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  placeholder="Enter OTP"
                  className="bg-white text-slate-900 placeholder-slate-500 border-slate-300 focus:ring-primary focus:border-primary text-sm h-11"
                  autoComplete="one-time-code"
                />
              </div>
              <Button type="submit" className="w-full py-3" disabled={loading || !otp}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : null} Verify OTP
              </Button>
              <Button variant="outline" onClick={() => setView('signIn')} className="w-full py-3 text-blue-300 border-blue-300 hover:bg-blue-300 hover:text-slate-800">
                Back to Login
              </Button>
            </form>
          )}
          
          {view === 'resetPasswordForm' && (
             <form onSubmit={handleResetPassword} className="space-y-6">
              <h2 className="text-xl font-semibold text-white text-center">Reset Your Password</h2>
              <p className="text-sm text-slate-300 text-center">OTP verified. Please enter your new password below.</p>
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
                <Button variant="outline" onClick={() => setView('signIn')} className="w-full py-3 text-blue-300 border-blue-300 hover:bg-blue-300 hover:text-slate-800">
                Back to Login
              </Button>
             </form>
           )}

        </div>
      </main>

      <footer className="bg-white py-4 shadow-sm">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 px-4 sm:px-6 lg:px-8">
          <p className="mb-2 sm:mb-0 text-center sm:text-left">Copyright ©{isClient ? new Date().getFullYear() : ''} by Saryug College, Samastipur, Bihar</p>
          <p className="text-center sm:text-right">Design By Mantix</p>
        </div>
      </footer>
    </div>
  );
}
    

    

    