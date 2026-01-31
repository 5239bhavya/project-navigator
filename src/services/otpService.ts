// OTP Service for email verification
import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Store OTPs temporarily in memory (in production, use a more secure method)
const otpStore: Map<string, { otp: string; expiresAt: number }> = new Map();

// Generate a 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via EmailJS
export const sendOTP = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Store OTP
    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    // Initialize EmailJS
    emailjs.init(PUBLIC_KEY);

    // Send email
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_email: email,
      otp_code: otp,
      app_name: 'Shiv Furniture',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return { success: false, error: error?.text || 'Failed to send OTP' };
  }
};

// Verify OTP
export const verifyOTP = (email: string, otp: string): { valid: boolean; error?: string } => {
  const stored = otpStore.get(email.toLowerCase());

  if (!stored) {
    return { valid: false, error: 'No OTP found. Please request a new one.' };
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, error: 'OTP has expired. Please request a new one.' };
  }

  if (stored.otp !== otp) {
    return { valid: false, error: 'Invalid OTP. Please try again.' };
  }

  // Clear OTP after successful verification
  otpStore.delete(email.toLowerCase());
  return { valid: true };
};

// Resend OTP
export const resendOTP = async (email: string): Promise<{ success: boolean; error?: string }> => {
  return sendOTP(email);
};
