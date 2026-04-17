import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Loader2, Mail, Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }
    
    setIsLoading(true);
    try {
      if (isSignIn) {
        // SignIn Flow
        console.log('Attempting sign in with:', email);
        const { error } = await signIn(email, password);
        if (error) {
          toast.error('Sign in failed', { description: error.message });
        } else {
          toast.success('Signed in successfully');
        }
      } else {
        // SignUp Flow
        if (!fullName.trim()) {
          toast.error('Please enter your full name to create an account');
          setIsLoading(false);
          return;
        }
        
        console.log('Attempting sign up with:', email, fullName);
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error('Sign up failed', { description: error.message });
        } else {
          toast.success('Account created! Please sign in.');
          setIsSignIn(true);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error('An error occurred', { description: error?.message || 'Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white overflow-hidden">
      {/* Left Side: Solid Dark/Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-[#09090b] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05)_0,transparent_50%)]" />
        <div className="relative z-20 flex flex-col justify-between p-16 w-full h-full">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200">
              <Layers className="h-5 w-5 text-black" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">DeckStore</span>
          </div>
          
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              Secure Infrastructure
            </div>
            <h1 className="text-5xl font-bold tracking-tight leading-tight">
              Enterprise Data <br />
              <span className="text-slate-500">Managed Simply.</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-sm leading-relaxed font-light">
              The professional standard for securing, sharing, and collaborating on technical project documentation.
            </p>
          </div>
          
          <div className="pt-12 border-t border-white/5">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-300">Systems Operational • Local Backend</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Clean Light Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-8 lg:p-12 relative">
        <div className="w-full max-w-md space-y-10">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Account access
            </h2>
            <p className="text-slate-500 text-base">
              Manage your technical assets with precision.
            </p>
          </div>

          <Tabs value={isSignIn ? 'login' : 'signup'} className="w-full" onValueChange={(v) => setIsSignIn(v === 'login')}>
            <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-slate-100/80 rounded-xl mb-8 border border-slate-200/50">
              <TabsTrigger value="login" className="rounded-lg font-medium text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg font-medium text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit}>
              <TabsContent value="login" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-slate-700 font-medium ml-0.5 text-sm uppercase tracking-wide">Work Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="name@company.com"
                        className="h-12 pl-12 bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all rounded-xl shadow-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between mx-0.5">
                      <Label htmlFor="login-password" className="text-slate-700 font-medium text-sm uppercase tracking-wide">Password</Label>
                      <a href="#" className="text-xs font-semibold text-slate-900 hover:opacity-70 transition-opacity">
                        Reset password?
                      </a>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="h-12 pl-12 pr-12 bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all rounded-xl shadow-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-slate-700 font-medium ml-0.5 text-sm uppercase tracking-wide">Full Name</Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors" />
                      <Input
                        id="signup-name"
                        placeholder="John Doe"
                        className="h-12 pl-12 bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all rounded-xl shadow-sm"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={!isSignIn}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-slate-700 font-medium ml-0.5 text-sm uppercase tracking-wide">Email address</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@example.com"
                        className="h-12 pl-12 bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all rounded-xl shadow-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-slate-700 font-medium ml-0.5 text-sm uppercase tracking-wide">Password</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors" />
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="h-12 pl-12 pr-12 bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all rounded-xl shadow-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </TabsContent>
            </form>
          </Tabs>

          <footer className="pt-8 text-center">
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              By continuing, you agree to our <a href="#" className="underline hover:text-slate-600">Terms of Service</a> and <a href="#" className="underline hover:text-slate-600">Privacy Policy</a>.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
