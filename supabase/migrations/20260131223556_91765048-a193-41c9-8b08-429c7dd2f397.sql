-- ============================================================================
-- Budget Enforcement Triggers
-- Updates product budgets on payment/confirmation events
-- ============================================================================

-- Function: Credit budget when customer payment is completed
CREATE OR REPLACE FUNCTION public.credit_budget_on_customer_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_line RECORD;
  v_proportion NUMERIC;
  v_invoice_total NUMERIC;
BEGIN
  -- Only trigger on completed payments (INSERT with status = 'completed')
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get invoice total for proportion calculation
  SELECT total_amount INTO v_invoice_total
  FROM customer_invoices
  WHERE id = NEW.customer_invoice_id;

  IF v_invoice_total IS NULL OR v_invoice_total <= 0 THEN
    RETURN NEW;
  END IF;

  -- Loop through invoice lines and credit their linked budgets proportionally
  FOR v_line IN
    SELECT cil.budget_id, cil.subtotal
    FROM customer_invoice_lines cil
    WHERE cil.customer_invoice_id = NEW.customer_invoice_id
      AND cil.budget_id IS NOT NULL
  LOOP
    -- Calculate proportional amount for this line
    v_proportion := (v_line.subtotal / v_invoice_total) * NEW.amount;

    -- Credit the budget (increase achieved_amount for income budgets)
    UPDATE budgets
    SET 
      achieved_amount = achieved_amount + v_proportion,
      remaining_balance = budgeted_amount - (achieved_amount + v_proportion),
      achievement_percentage = CASE 
        WHEN budgeted_amount > 0 THEN ((achieved_amount + v_proportion) / budgeted_amount) * 100
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = v_line.budget_id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Function: Deduct budget when purchase order is confirmed
CREATE OR REPLACE FUNCTION public.deduct_budget_on_purchase_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_line RECORD;
BEGIN
  -- Only trigger when status changes to 'confirmed'
  IF OLD.status = 'confirmed' OR NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Loop through PO lines and deduct from their linked budgets
  FOR v_line IN
    SELECT pol.budget_id, pol.subtotal
    FROM purchase_order_lines pol
    WHERE pol.purchase_order_id = NEW.id
      AND pol.budget_id IS NOT NULL
  LOOP
    -- Deduct from the budget (increase achieved_amount for expense budgets = spent amount)
    UPDATE budgets
    SET 
      achieved_amount = achieved_amount + v_line.subtotal,
      remaining_balance = budgeted_amount - (achieved_amount + v_line.subtotal),
      achievement_percentage = CASE 
        WHEN budgeted_amount > 0 THEN ((achieved_amount + v_line.subtotal) / budgeted_amount) * 100
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = v_line.budget_id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for customer payment → budget credit
DROP TRIGGER IF EXISTS trigger_credit_budget_on_customer_payment ON invoice_payments;
CREATE TRIGGER trigger_credit_budget_on_customer_payment
  AFTER INSERT ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION credit_budget_on_customer_payment();

-- Create trigger for purchase order confirmed → budget deduction
DROP TRIGGER IF EXISTS trigger_deduct_budget_on_purchase_confirmed ON purchase_orders;
CREATE TRIGGER trigger_deduct_budget_on_purchase_confirmed
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION deduct_budget_on_purchase_confirmed();