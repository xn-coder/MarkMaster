
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto flex items-center justify-between py-3 px-4 sm:px-6 lg:px-8 h-auto md:h-24"> {/* Adjusted height for responsiveness */}
          <div className="flex-shrink-0">
            <Image
              src="https://placehold.co/50x50.png" // Placeholder for circular logo
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

      {/* Main content with background image and login form */}
      <main className="flex-grow relative flex items-center justify-center">
        <Image
          src="https://placehold.co/1920x1080.png" // Standard aspect ratio for background
          alt="Login background"
          layout="fill"
          objectFit="cover"
          className="absolute inset-0 -z-10"
          data-ai-hint="laptop desk" // Hint for image search
          priority 
        />
        <div className="bg-slate-800 bg-opacity-80 backdrop-blur-sm p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md m-4 z-10">
          <form className="space-y-6">
            <div>
              <Input
                type="email"
                id="email"
                name="email"
                defaultValue="prashiklikhar009@gmail.com"
                className="bg-white text-slate-900 placeholder-slate-500 border-slate-300 focus:ring-primary focus:border-primary text-sm h-11"
                autoComplete="email"
              />
            </div>
            <div>
              <Input
                type="password"
                id="password"
                name="password"
                defaultValue="********"
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
                <Link href="#" className="font-medium text-white hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>
            </div>
            <div>
              <Button
                type="submit"
                className="w-full py-3 px-4 text-sm font-medium" // Using theme default colors by not specifying bg/text color
              >
                Login
              </Button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-4 shadow-sm"> {/* Added shadow like header */}
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 px-4 sm:px-6 lg:px-8">
          <p className="mb-2 sm:mb-0 text-center sm:text-left">Copyright ©2025 by Saryug College, Samastipur, Bihar</p>
          <p className="text-center sm:text-right">Design By Mantix</p>
        </div>
      </footer>
    </div>
  );
}

    