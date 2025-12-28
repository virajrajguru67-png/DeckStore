import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Loader2, Mail, Lock, User, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, resendVerificationEmail, user, isLoading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isSignIn && !fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignIn) {
        const { error } = await signIn(email, password);
        if (error) {
          // Show specific error messages
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password', {
              description: 'Please check your credentials and try again'
            });
          } else if (error.message.includes('verify your email') || error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
            toast.error('Email not verified', {
              description: 'Please verify your email before signing in. Click "Resend verification email" below.',
              duration: 10000,
            });
            setShowResendEmail(true);
          } else {
            toast.error('Sign in failed', { description: error.message });
          }
        } else {
          toast.success('Signed in successfully');
          // Navigation will happen via useEffect when user state updates
        }
      } else {
        const { error, data } = await signUp(email, password, fullName);
        if (error) {
          // Show specific error messages
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            toast.error('Email already registered', {
              description: 'This email is already in use. Please sign in instead.'
            });
            setIsSignIn(true);
          } else if (error.message.includes('Password')) {
            toast.error('Password error', { description: error.message });
          } else {
            toast.error('Sign up failed', { description: error.message });
          }
        } else {
          // Check if email confirmation is required
          if (data?.user && !data.session) {
            // Email confirmation required
            toast.success('Account created successfully!', {
              description: 'Please check your email (including spam folder) to verify your account. If you don\'t receive it, click "Resend verification email" below.',
              duration: 12000,
            });
            // Switch to sign in mode and show resend button
            setIsSignIn(true);
            setShowResendEmail(true);
            setPassword('');
            setFullName('');
            // Keep email so user can resend verification
          } else if (data?.session) {
            // Auto-confirmed (email confirmation disabled)
            toast.success('Account created and signed in!');
            // Navigation will happen via useEffect
          } else {
            toast.success('Account created!');
            setIsSignIn(true);
            setEmail('');
            setPassword('');
            setFullName('');
          }
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error('An error occurred', {
        description: error?.message || 'Please try again. If the problem persists, check your Supabase configuration.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-100"
        style={{ backgroundImage: 'url("/images/login-bg.png")' }}
      />
      <div className="absolute inset-0 z-0 bg-background/40 backdrop-blur-[1px] backdrop-saturate-150" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-background/10 to-background/90" />

      <Card className="w-full max-w-md relative z-10 backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
        <CardHeader className="space-y-1 text-center pb-8 pt-8">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="h-7 w-7 text-white" />
            </div>
            <span>Welcome to DeckStore</span>
          </CardTitle>
          <CardDescription className="text-base font-medium flex items-center justify-center gap-2 pt-2">
            {isSignIn ? (
              <>
                <LogIn className="h-4 w-4 text-muted-foreground" />
                Sign in to your account
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                Create a new account
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isSignIn && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="ml-1 flex items-center gap-2">
                  <User className="h-4 w-4" /> Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isSignIn}
                  className="h-11 bg-background/50 border-input/50 focus:bg-background transition-colors"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="ml-1 flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-background/50 border-input/50 focus:bg-background transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="ml-1 flex items-center gap-2">
                <Lock className="h-4 w-4" /> Password
              </Label>
              <div className="relative group">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-background/50 border-input/50 focus:bg-background transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors outline-none focus:ring-0"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-base font-medium shadow-md shadow-primary/20 hover:shadow-lg transition-all duration-300" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignIn ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          {showResendEmail && isSignIn && email && (
            <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-xl">
              <p className="text-sm text-foreground/80 mb-3 font-medium text-center">
                Didn't receive the verification email?
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-primary/20 hover:bg-primary/5 hover:text-primary"
                disabled={resendingEmail}
                onClick={async () => {
                  setResendingEmail(true);
                  const { error } = await resendVerificationEmail(email);
                  if (error) {
                    toast.error('Failed to resend email', { description: error.message });
                  } else {
                    toast.success('Verification email sent!', {
                      description: 'Please check your inbox (including spam folder).',
                    });
                  }
                  setResendingEmail(false);
                }}
              >
                {resendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resend Verification Email
              </Button>
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignIn(!isSignIn);
                setShowResendEmail(false);
              }}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4"
            >
              {isSignIn ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

