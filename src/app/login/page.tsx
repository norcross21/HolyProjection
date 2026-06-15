'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { Sparkles, ArrowRight, User, Mail, ShieldAlert, MonitorPlay, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(true);

  // Check if Supabase URL is configured
  useEffect(() => {
    const configured =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-project-id.supabase.co';
    setIsDemo(!configured);

    if (configured) {
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
      } catch (err: any) {
        setErrorMsg(err.message || 'Authentication failed. Please check your details.');
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Background glow spheres */}
      <div className="absolute top-[-20%] left-[-20%] h-[70vw] w-[70vw] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] h-[70vw] w-[70vw] rounded-full bg-indigo-900/15 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-md px-6 py-12">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8 text-center animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-indigo-500/25 mb-4 ring-1 ring-white/10">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            HolyProjection
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Dual-view real-time church presentation engine
          </p>
        </div>

        {/* Demo Mode Notice */}
        {isDemo && (
          <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300 backdrop-blur-md shadow-md animate-slide-up">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Demo Mode Active</span>
                No Supabase URL detected in <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200">.env.local</code>. Realtime sync will run locally via <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200">BroadcastChannel</code>.
              </div>
            </div>
          </div>
        )}

        {/* Auth Form Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5 animate-slide-up">
          <h2 className="text-lg font-bold text-white mb-6">
            {isSignUp ? 'Create your presenter account' : 'Sign in to dashboard'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-5">
            {errorMsg && (
              <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-3.5 text-xs text-red-400">
                {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-3.5 text-xs text-emerald-400">
                {successMsg}
              </div>
            )}

            {(isSignUp || isDemo) && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pastor Stephen"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@church.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                />
              </div>
            </div>

            {(!isDemo) && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
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
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-all"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          )}

          {isDemo && (
            <div className="mt-6 flex flex-col items-center">
              <div className="flex items-center w-full my-4">
                <div className="flex-1 border-t border-slate-800"></div>
                <span className="px-3 text-xs text-slate-600 font-medium">OR</span>
                <div className="flex-1 border-t border-slate-800"></div>
              </div>

              <button
                onClick={handleBypassDemo}
                className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-all"
              >
                <MonitorPlay className="h-4 w-4 text-indigo-400" />
                <span>Quick-bypass using default credentials</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs text-slate-600">
          Designed for houses of worship. Supported by Google DeepMind and Vercel.
        </p>
      </div>
    </div>
  );
}
