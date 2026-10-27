ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocktake_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocktake_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_errors ENABLE ROW LEVEL SECURITY;

-- Profiles: users read self; owners read all
CREATE POLICY profiles_select_self ON profiles FOR SELECT
  USING (id = auth.uid() OR public.is_owner());
CREATE POLICY profiles_update_owner ON profiles FOR UPDATE
  USING (public.is_owner());

-- Business settings: owners full; employees read non-sensitive fields via view (here: read for auth users)
CREATE POLICY settings_owner ON business_settings FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY settings_read ON business_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY payment_methods_read ON payment_methods FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY payment_methods_owner ON payment_methods FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());

-- Products: employees see active products without cost; owners see all
CREATE POLICY products_employee_select ON products FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      public.is_owner() OR status = 'active'
    )
  );
CREATE POLICY products_owner_write ON products FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());

-- Inventory movements: owners all; employees read own-sale related (simplified: employees read)
CREATE POLICY inventory_movements_select ON inventory_movements FOR SELECT
  USING (auth.uid() IS NOT NULL AND (public.is_owner() OR movement_type IN ('sale', 'return_restock')));
CREATE POLICY inventory_movements_owner ON inventory_movements FOR INSERT
  WITH CHECK (public.is_owner());

-- Sales: cashiers insert/select own; owners all
CREATE POLICY sales_select ON sales FOR SELECT
  USING (cashier_id = auth.uid() OR public.is_owner());
CREATE POLICY sales_insert ON sales FOR INSERT
  WITH CHECK (cashier_id = auth.uid() OR public.is_owner());
CREATE POLICY sales_owner_update ON sales FOR UPDATE
  USING (public.is_owner());

CREATE POLICY sale_items_select ON sale_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND (s.cashier_id = auth.uid() OR public.is_owner()))
  );
CREATE POLICY sale_items_insert ON sale_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND (s.cashier_id = auth.uid() OR public.is_owner()))
  );

CREATE POLICY sale_payments_select ON sale_payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND (s.cashier_id = auth.uid() OR public.is_owner()))
  );
CREATE POLICY sale_payments_insert ON sale_payments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id AND (s.cashier_id = auth.uid() OR public.is_owner()))
  );

-- Owner-only financial tables
CREATE POLICY suppliers_owner ON suppliers FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY suppliers_employee_read ON suppliers FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_owner() = false AND false);

CREATE POLICY expenses_owner ON expenses FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY owner_tx_owner ON owner_transactions FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY purchase_owner ON purchase_orders FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY purchase_lines_owner ON purchase_order_lines FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY purchase_receipts_owner ON purchase_receipts FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY purchase_receipt_lines_owner ON purchase_receipt_lines FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY supplier_invoices_owner ON supplier_invoices FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY supplier_payments_owner ON supplier_payments FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY audit_owner ON audit_logs FOR SELECT
  USING (public.is_owner());
CREATE POLICY audit_insert ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Cash shifts: cashier own + owners
CREATE POLICY cash_shifts_select ON cash_shifts FOR SELECT
  USING (cashier_id = auth.uid() OR public.is_owner());
CREATE POLICY cash_shifts_write ON cash_shifts FOR ALL
  USING (cashier_id = auth.uid() OR public.is_owner())
  WITH CHECK (cashier_id = auth.uid() OR public.is_owner());

CREATE POLICY cash_movements_select ON cash_movements FOR SELECT
  USING (
    public.is_owner() OR EXISTS (
      SELECT 1 FROM cash_shifts cs WHERE cs.id = shift_id AND cs.cashier_id = auth.uid()
    )
  );
CREATE POLICY cash_movements_insert ON cash_movements FOR INSERT
  WITH CHECK (recorded_by = auth.uid() OR public.is_owner());

-- Categories: all authenticated read; owner write
CREATE POLICY categories_read ON categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY categories_owner ON categories FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY expense_categories_read ON expense_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY expense_categories_owner ON expense_categories FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY customers_auth ON customers FOR ALL
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY stocktake_owner ON stocktake_sessions FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY stocktake_counts_owner ON stocktake_counts FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY sale_returns_select ON sale_returns FOR SELECT
  USING (public.is_owner() OR processed_by = auth.uid());
CREATE POLICY sale_returns_insert ON sale_returns FOR INSERT
  WITH CHECK (processed_by = auth.uid() OR public.is_owner());

CREATE POLICY sale_return_items_policy ON sale_return_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sale_returns r
      WHERE r.id = return_id AND (r.processed_by = auth.uid() OR public.is_owner())
    )
  );

CREATE POLICY customer_credit_owner ON customer_credit_ledger FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY import_jobs_owner ON import_jobs FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY import_errors_owner ON import_errors FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());
