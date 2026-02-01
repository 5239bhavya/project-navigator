-- Function: Deduct budget when purchase order is confirmed (FIXED VERSION)
CREATE OR REPLACE FUNCTION public.deduct_budget_on_purchase_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_line RECORD;
  v_current_achieved NUMERIC;
  v_new_achieved NUMERIC;
  v_budgeted NUMERIC;
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
    -- Get current budget values FIRST
    SELECT achieved_amount, budgeted_amount 
    INTO v_current_achieved, v_budgeted
    FROM budgets
    WHERE id = v_line.budget_id;

    -- Calculate new achieved amount (for expense budgets, achieved = spent)
    v_new_achieved := COALESCE(v_current_achieved, 0) + v_line.subtotal;

    -- Update budget with correct calculation
    UPDATE budgets
    SET 
      achieved_amount = v_new_achieved,
      remaining_balance = v_budgeted - v_new_achieved,  -- FIXED: Use new achieved amount
      achievement_percentage = CASE 
        WHEN v_budgeted > 0 THEN (v_new_achieved / v_budgeted) * 100
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = v_line.budget_id;
  END LOOP;

  RETURN NEW;
END;
$$;