/**
 * Razorpay Client Service
 * 
 * Handles Razorpay Checkout integration for Customer Portal
 * - Load Razorpay SDK
 * - Create orders via edge function
 * - Verify payments server-side
 */

import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

interface RazorpayPaymentResult {
  success: boolean;
  paymentId?: string;
  paymentNumber?: string;
  razorpayPaymentId?: string;
  paymentDate?: string;
  newPaidAmount?: number;
  newBalanceDue?: number;
  newStatus?: string;
  error?: string;
}

export interface RazorpayCheckoutOptions {
  invoiceId: string;
  invoiceNumber: string;
  amount: number; // in INR
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  productDescription: string;
  onSuccess: (result: RazorpayPaymentResult) => void;
  onError: (error: string) => void;
  onDismiss?: () => void;
}

/**
 * Load Razorpay Checkout script dynamically
 */
export async function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Create Razorpay order via edge function
 */
export async function createRazorpayOrder(
  invoiceId: string,
  amount: number
): Promise<{ success: boolean; order?: RazorpayOrder; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('razorpay-order', {
      body: {
        action: 'create_order',
        invoiceId,
        amount,
      },
    });

    if (error) {
      console.error('Error creating Razorpay order:', error);
      return { success: false, error: error.message };
    }

    if (!data.success) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      order: {
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        keyId: data.keyId,
      },
    };
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    return { success: false, error: 'Failed to create payment order' };
  }
}

/**
 * Verify Razorpay payment via edge function
 */
export async function verifyRazorpayPayment(
  invoiceId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  amount: number
): Promise<RazorpayPaymentResult> {
  try {
    const { data, error } = await supabase.functions.invoke('razorpay-order', {
      body: {
        action: 'verify_payment',
        invoiceId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        amount,
      },
    });

    if (error) {
      console.error('Error verifying payment:', error);
      return { success: false, error: error.message };
    }

    return data as RazorpayPaymentResult;
  } catch (err) {
    console.error('Payment verification error:', err);
    return { success: false, error: 'Payment verification failed' };
  }
}

/**
 * Open Razorpay Checkout modal
 */
export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<void> {
  // Load script if not loaded
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    options.onError('Failed to load payment gateway');
    return;
  }

  // Create order
  const orderResult = await createRazorpayOrder(options.invoiceId, options.amount);
  if (!orderResult.success || !orderResult.order) {
    options.onError(orderResult.error || 'Failed to create order');
    return;
  }

  const { orderId, keyId } = orderResult.order;

  // Configure Razorpay options
  const razorpayOptions = {
    key: keyId,
    amount: Math.round(options.amount * 100), // in paise
    currency: 'INR',
    name: 'Shiv Furniture',
    description: options.productDescription,
    order_id: orderId,
    prefill: {
      name: options.customerName,
      email: options.customerEmail || '',
      contact: options.customerPhone || '',
    },
    notes: {
      invoice_id: options.invoiceId,
      invoice_number: options.invoiceNumber,
    },
    theme: {
      color: '#2563eb',
    },
    handler: async function (response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) {
      // Verify payment server-side
      const verifyResult = await verifyRazorpayPayment(
        options.invoiceId,
        response.razorpay_order_id,
        response.razorpay_payment_id,
        response.razorpay_signature,
        options.amount
      );

      if (verifyResult.success) {
        options.onSuccess(verifyResult);
      } else {
        options.onError(verifyResult.error || 'Payment verification failed');
      }
    },
    modal: {
      ondismiss: function () {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
    },
  };

  // Open Razorpay checkout
  const razorpay = new window.Razorpay(razorpayOptions);
  razorpay.on('payment.failed', function (response: any) {
    console.error('Razorpay payment failed:', response.error);
    options.onError(
      response.error?.description || 'Payment failed. Please try again.'
    );
  });
  razorpay.open();
}
