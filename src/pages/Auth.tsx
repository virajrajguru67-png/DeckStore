import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Deck Store</CardTitle>
          <CardDescription>
            {isSignIn ? 'Sign in to your account' : 'Create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isSignIn && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isSignIn}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignIn ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>
          
          {showResendEmail && isSignIn && email && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the verification email?
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
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
          
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsSignIn(!isSignIn);
                setShowResendEmail(false);
              }}
              className="text-primary hover:underline"
            >
              {isSignIn ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

