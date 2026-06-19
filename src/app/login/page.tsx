'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { ArrowRight, User, Mail, ShieldAlert, MonitorPlay, KeyRound } from 'lucide-react';
import Logo from '@/components/Logo';

const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-project-id.supabase.co';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Authentication failed. Please check your details.';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const isDemo = !isSupabaseConfigured;

  // Check if Supabase URL is configured
  useEffect(() => {
    if (isSupabaseConfigured) {
      // If already logged in, redirect to dashboard
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.push('/dashboard');
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          router.push('/dashboard');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Check localstorage mock session
      const savedUser = localStorage.getItem('holyproj_user');
      if (savedUser) {
        router.push('/dashboard');
      }
    }
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isDemo) {
      // Demo Mode simulation
      const user = {
        email: email || 'demo@church.org',
        displayName: displayName || 'Presenter',
      };
      localStorage.setItem('holyproj_user', JSON.stringify(user));
      setSuccessMsg(isSignUp ? 'Demo account created locally!' : 'Signed in successfully!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 800);
    } else {
      // Supabase Authentication Mode
      try {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              // Send the confirmation link back to wherever the user signed up
              // (e.g. the production site) instead of Supabase's default Site URL.
              emailRedirectTo: `${window.location.origin}/login`,
              data: {
                displayName: displayName || email.split('@')[0],
              },
            },
          });
          if (error) throw error;

          if (data.user && data.session === null) {
            setSuccessMsg('Sign-up successful! Please check your email to confirm your account.');
            setIsLoading(false);
          } else {
            setSuccessMsg('Account created successfully! Redirecting...');
            setTimeout(() => router.push('/dashboard'), 1000);
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          router.push('/dashboard');
        }
      } catch (err: unknown) {
        setErrorMsg(errorMessage(err));
        setIsLoading(false);
      }
    }
  };

  const handleBypassDemo = () => {
    const user = {
      email: 'collaborator@church.org',
      displayName: 'Lead Presenter',
    };
    localStorage.setItem('holyproj_user', JSON.stringify(user));
    router.push('/dashboard');
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-stone-50 font-sans text-stone-900">
      {/* Soft ambient colour wash */}
      <div className="absolute top-[-20%] left-[-20%] h-[60vw] w-[60vw] rounded-full bg-sky-200/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] h-[60vw] w-[60vw] rounded-full bg-teal-200/40 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-md px-6 py-12">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Logo size={42} />
          <p className="mt-3 text-sm text-stone-500">
            Dual-view real-time church presentation engine
          </p>
        </div>

        {/* Demo Mode Notice */}
        {isDemo && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Demo Mode Active</span>
                No Supabase URL detected in <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">.env.local</code>. Realtime sync will run locally via <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">BroadcastChannel</code>.
              </div>
            </div>
          </div>
        )}

        {/* Auth Form Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-200/60">
          <h2 className="text-lg font-bold text-stone-900 mb-6">
            {isSignUp ? 'Create your presenter account' : 'Sign in to dashboard'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-5">
            {errorMsg && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-700">
                {successMsg}
              </div>
            )}

            {(isSignUp || isDemo) && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pastor Stephen"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                <input
                  type="email"
                  required
                  placeholder="name@church.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition-all"
                />
              </div>
            </div>

            {(!isDemo) && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-600 hover:from-sky-400 hover:to-teal-500 py-3 font-semibold text-white shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Presenter Account' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and Signup */}
          {!isDemo && (
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-teal-600 hover:text-teal-500 font-medium transition-all"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          )}

          {isDemo && (
            <div className="mt-6 flex flex-col items-center">
              <div className="flex items-center w-full my-4">
                <div className="flex-1 border-t border-stone-200"></div>
                <span className="px-3 text-xs text-stone-400 font-medium">OR</span>
                <div className="flex-1 border-t border-stone-200"></div>
              </div>

              <button
                onClick={handleBypassDemo}
                className="flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-stone-800 transition-all"
              >
                <MonitorPlay className="h-4 w-4 text-teal-500" />
                <span>Quick-bypass using default credentials</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs text-stone-400">
          Designed for houses of worship. Supported by Google DeepMind and Vercel.
        </p>
      </div>
    </div>
  );
}
