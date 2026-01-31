/**
 * Razorpay Order Creation & Payment Verification Edge Function
 * 
 * Handles:
 * 1. Creating Razorpay orders for invoice payments
 * 2. Verifying Razorpay payment signatures server-side
 * 
 * Security:
 * - Signature verification using HMAC SHA256
 * - Never trusts client-side payment confirmation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CreateOrderRequest {
  action: 'create_order';
  invoiceId: string;
  amount: number; // in INR (will be converted to paise)
}

interface VerifyPaymentRequest {
  action: 'verify_payment';
  invoiceId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  amount: number;
}

type RequestBody = CreateOrderRequest | VerifyPaymentRequest;

/**
 * Verify Razorpay payment signature using HMAC SHA256
 */
function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const body = orderId + "|" + paymentId;
  const expectedSignature = createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

/**
 * Generate payment number
 */
function generatePaymentNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RZP-${year}${month}-${random}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: RequestBody = await req.json();

    // ============ CREATE ORDER ============
    if (body.action === 'create_order') {
      const { invoiceId, amount } = body as CreateOrderRequest;

      // Validate invoice exists and is payable
      const { data: invoice, error: invoiceError } = await supabase
        .from('customer_invoices')
        .select('id, invoice_number, total_amount, paid_amount, status')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) {
        console.error('Invoice fetch error:', invoiceError);
        return new Response(
          JSON.stringify({ success: false, error: 'Invoice not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if invoice is payable
      if (!['posted', 'partially_paid'].includes(invoice.status)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invoice is not payable' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate balance due
      const balanceDue = Number(invoice.total_amount) - Number(invoice.paid_amount);
      if (amount > balanceDue) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Amount exceeds balance due (₹${balanceDue.toLocaleString()})` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create Razorpay order
      const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
      const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${razorpayAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to paise
          currency: 'INR',
          receipt: invoice.invoice_number,
          notes: {
            invoice_id: invoiceId,
            invoice_number: invoice.invoice_number,
          },
        }),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('Razorpay order creation failed:', errorText);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create payment order' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const razorpayOrder = await orderResponse.json();
      console.log('Razorpay order created:', razorpayOrder.id);

      return new Response(
        JSON.stringify({
          success: true,
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: RAZORPAY_KEY_ID, // Public key for frontend
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ VERIFY PAYMENT ============
    if (body.action === 'verify_payment') {
      const { 
        invoiceId, 
        razorpayOrderId, 
        razorpayPaymentId, 
        razorpaySignature,
        amount 
      } = body as VerifyPaymentRequest;

      // Step 1: Verify signature (CRITICAL SECURITY)
      const isValidSignature = verifySignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        RAZORPAY_KEY_SECRET
      );

      if (!isValidSignature) {
        console.error('Invalid Razorpay signature for order:', razorpayOrderId);
        return new Response(
          JSON.stringify({ success: false, error: 'Payment verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Payment signature verified for order:', razorpayOrderId);

      // Step 2: Fetch invoice for validation
      const { data: invoice, error: invoiceError } = await supabase
        .from('customer_invoices')
        .select('id, total_amount, paid_amount, status')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) {
        console.error('Invoice fetch error:', invoiceError);
        return new Response(
          JSON.stringify({ success: false, error: 'Invoice not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 3: Create payment record with system timestamp
      const paymentNumber = generatePaymentNumber();
      const paymentDate = new Date().toISOString();

      const { data: payment, error: paymentError } = await supabase
        .from('invoice_payments')
        .insert({
          customer_invoice_id: invoiceId,
          payment_number: paymentNumber,
          payment_date: paymentDate.split('T')[0],
          amount: amount,
          mode: 'online',
          status: 'completed',
          reference: razorpayPaymentId,
          notes: `Razorpay Order: ${razorpayOrderId}`,
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Payment record creation failed:', paymentError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to record payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Payment recorded:', payment.id);

      // Step 4: Recalculate paid_amount from ALL completed payments
      const { data: allPayments, error: paymentsError } = await supabase
        .from('invoice_payments')
        .select('amount')
        .eq('customer_invoice_id', invoiceId)
        .eq('status', 'completed');

      if (paymentsError) {
        console.error('Payments fetch error:', paymentsError);
      }

      const newPaidAmount = allPayments?.reduce(
        (sum, p) => sum + Number(p.amount), 0
      ) || 0;
      
      const totalAmount = Number(invoice.total_amount);
      const newBalanceDue = totalAmount - newPaidAmount;

      // Step 5: Compute new status
      let newStatus: string;
      if (newBalanceDue <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partially_paid';
      } else {
        newStatus = 'posted';
      }

      // Step 6: Update invoice with new paid amount and status
      const { error: updateError } = await supabase
        .from('customer_invoices')
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
        })
        .eq('id', invoiceId);

      if (updateError) {
        console.error('Invoice update error:', updateError);
        // Payment was recorded but invoice not updated - log for reconciliation
      }

      console.log('Invoice updated - Status:', newStatus, 'Paid:', newPaidAmount);

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: payment.id,
          paymentNumber: payment.payment_number,
          razorpayPaymentId,
          paymentDate,
          newPaidAmount,
          newBalanceDue,
          newStatus,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Razorpay function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
