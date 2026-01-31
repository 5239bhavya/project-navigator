import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, UserPlus, Check, X, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendOTP, verifyOTP, resendOTP } from '@/services/otpService';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface PasswordRequirement {
  label: string;
  regex: RegExp;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', regex: /.{8,}/ },
  { label: 'At least 1 uppercase letter', regex: /[A-Z]/ },
  { label: 'At least 1 lowercase letter', regex: /[a-z]/ },
  { label: 'At least 1 number', regex: /[0-9]/ },
  { label: 'At least 1 special character', regex: /[!@#$%^&*(),.?":{}|<>]/ },
];

type SignupStep = 'email' | 'otp' | 'details';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [step, setStep] = useState<SignupStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email address';
    }
    return null;
  };

  const validatePassword = (password: string) => {
    for (const req of passwordRequirements) {
      if (!req.regex.test(password)) {
        return `Password must have ${req.label.toLowerCase()}`;
      }
    }
    return null;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) {
      toast.error(emailError);
      return;
    }

    setIsLoading(true);
    const result = await sendOTP(email);
    setIsLoading(false);

    if (result.success) {
      toast.success('OTP sent to your email!');
      setStep('otp');
      startResendCooldown();
    } else {
      toast.error(result.error || 'Failed to send OTP');
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    const result = await resendOTP(email);
    setIsLoading(false);

    if (result.success) {
      toast.success('OTP resent to your email!');
      startResendCooldown();
    } else {
      toast.error(result.error || 'Failed to resend OTP');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }

    setIsLoading(true);
    const result = verifyOTP(email, otp);
    setIsLoading(false);

    if (result.valid) {
      toast.success('Email verified successfully!');
      setStep('details');
    } else {
      toast.error(result.error || 'Invalid OTP');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    const result = await signup({
      name: formData.name,
      email: email,
      password: formData.password,
      role: 'portal',
    });

    if (result.success) {
      toast.success('Account created successfully! You can now sign in.');
      navigate('/login');
    } else {
      toast.error(result.error || 'Failed to create account');
    }
    setIsLoading(false);
  };

  const getRequirementStatus = (regex: RegExp) => {
    return regex.test(formData.password);
  };

  const goBack = () => {
    if (step === 'otp') {
      setStep('email');
      setOtp('');
    } else if (step === 'details') {
      setStep('otp');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">SF</span>
          </div>
          <CardTitle className="text-2xl">
            {step === 'email' && 'Create Account'}
            {step === 'otp' && 'Verify Email'}
            {step === 'details' && 'Complete Profile'}
          </CardTitle>
          <CardDescription>
            {step === 'email' && 'Enter your email to get started'}
            {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
            {step === 'details' && 'Fill in your details to complete signup'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Sign In
                </Link>
              </p>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="mb-2 -ml-2"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>

              <div className="space-y-2">
                <Label>Enter OTP</Label>
                <div className="flex justify-center">
                  <InputOTP
                    value={otp}
                    onChange={setOtp}
                    maxLength={6}
                    disabled={isLoading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-sm"
                >
                  {resendCooldown > 0
                    ? `Resend OTP in ${resendCooldown}s`
                    : 'Resend OTP'}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Complete Details */}
          {step === 'details' && (
            <form onSubmit={handleCompleteSignup} className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="mb-2 -ml-2"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>

              <div className="rounded-lg bg-muted/50 p-3 text-center text-sm">
                <Check className="mr-1 inline-block h-4 w-4 text-chart-3" />
                Email verified: <span className="font-medium">{email}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>

                {formData.password && (
                  <div className="mt-2 space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center gap-2 text-xs',
                          getRequirementStatus(req.regex)
                            ? 'text-chart-3'
                            : 'text-muted-foreground'
                        )}
                      >
                        {getRequirementStatus(req.regex) ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Sign In
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
