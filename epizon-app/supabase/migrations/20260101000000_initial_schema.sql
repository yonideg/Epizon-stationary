-- EPIZÓN Stationary & Electronics — initial schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('owner', 'employee');
CREATE TYPE product_status AS ENUM ('active', 'archived');
CREATE TYPE sale_status AS ENUM ('completed', 'voided');
CREATE TYPE payment_method_type AS ENUM (
  'cash', 'bank_transfer', 'mobile_money', 'credit', 'other'
);
CREATE TYPE inventory_movement_type AS ENUM (
  'opening', 'sale', 'sale_void', 'return_restock', 'return_writeoff',
  'adjustment', 'purchase_receive', 'purchase_return', 'stocktake'
);
CREATE TYPE purchase_order_status AS ENUM (
  'draft', 'ordered', 'partially_received', 'received', 'cancelled'
);
CREATE TYPE cash_shift_status AS ENUM ('open', 'closed');
CREATE TYPE cash_movement_direction AS ENUM ('in', 'out');
CREATE TYPE stocktake_session_status AS ENUM (
  'in_progress', 'pending_review', 'applied', 'cancelled'
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'EPIZÓN Stationary',
  subtitle TEXT NOT NULL DEFAULT 'Stationary & Electronics',
  currency_code TEXT NOT NULL DEFAULT 'ETB',
  currency_symbol TEXT NOT NULL DEFAULT 'Br',
  timezone TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
  credit_sales_enabled BOOLEAN NOT NULL DEFAULT false,
  reorder_lead_time_days INT NOT NULL DEFAULT 7,
  reorder_safety_stock_days INT NOT NULL DEFAULT 7,
  default_low_stock_multiplier NUMERIC(6,2) NOT NULL DEFAULT 1.0,
  receipt_footer TEXT DEFAULT 'Thank you for shopping at EPIZÓN!',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO business_settings (business_name) VALUES ('EPIZÓN Stationary');

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code payment_method_type NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  counts_as_cash_drawer BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (code)
);

INSERT INTO payment_methods (code, label, counts_as_cash_drawer, sort_order) VALUES
  ('cash', 'Cash', true, 1),
  ('mobile_money', 'Mobile Money', false, 2),
  ('bank_transfer', 'Bank Transfer', false, 3),
  ('other', 'Other', false, 4);

CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO expense_categories (name, is_system) VALUES
  ('Rent', true), ('Electricity and utilities', true), ('Internet and telephone', true),
  ('Employee salary', true), ('Transport', true), ('Packaging and supplies', true),
  ('Maintenance', true), ('Bank and payment fees', true), ('Other operating expenses', true);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, parent_id)
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand TEXT,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  purchase_cost NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (purchase_cost >= 0),
  selling_price NUMERIC(18,2) NOT NULL CHECK (selling_price >= 0),
  promo_price NUMERIC(18,2) CHECK (promo_price IS NULL OR promo_price >= 0),
  stock_quantity NUMERIC(18,3) NOT NULL DEFAULT 0,
  weighted_avg_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  reorder_threshold NUMERIC(18,3) NOT NULL DEFAULT 0,
  reorder_quantity NUMERIC(18,3) NOT NULL DEFAULT 0,
  preferred_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  status product_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_name ON products USING gin (to_tsvector('simple', name));
CREATE INDEX idx_products_barcode ON products (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_category ON products (category_id);

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type inventory_movement_type NOT NULL,
  quantity_delta NUMERIC(18,3) NOT NULL,
  unit_cost NUMERIC(18,4),
  balance_after NUMERIC(18,3) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  reason TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_movements_product ON inventory_movements (product_id, created_at DESC);

CREATE TABLE stocktake_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status stocktake_session_status NOT NULL DEFAULT 'in_progress',
  scope_category_id UUID REFERENCES categories(id),
  started_by UUID REFERENCES profiles(id),
  applied_by UUID REFERENCES profiles(id),
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ
);

CREATE TABLE stocktake_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES stocktake_sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  system_quantity NUMERIC(18,3) NOT NULL,
  counted_quantity NUMERIC(18,3) NOT NULL,
  adjustment_reason TEXT,
  UNIQUE (session_id, product_id)
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  credit_limit NUMERIC(18,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT NOT NULL UNIQUE,
  business_date DATE NOT NULL,
  status sale_status NOT NULL DEFAULT 'completed',
  cashier_id UUID NOT NULL REFERENCES profiles(id),
  customer_id UUID REFERENCES customers(id),
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  cost_of_goods_sold NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  idempotency_key TEXT UNIQUE,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES profiles(id),
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_business_date ON sales (business_date DESC);
CREATE INDEX idx_sales_cashier ON sales (cashier_id, created_at DESC);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity NUMERIC(18,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(18,2) NOT NULL,
  line_total NUMERIC(18,2) NOT NULL,
  unit_cost NUMERIC(18,4) NOT NULL,
  line_cost NUMERIC(18,2) NOT NULL
);

CREATE TABLE sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  payment_method payment_method_type NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  tendered NUMERIC(18,2),
  change_given NUMERIC(18,2),
  reference TEXT
);

CREATE TABLE sale_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  return_number TEXT NOT NULL UNIQUE,
  total_refund NUMERIC(18,2) NOT NULL,
  reason TEXT NOT NULL,
  processed_by UUID NOT NULL REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sale_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
  sale_item_id UUID NOT NULL REFERENCES sale_items(id),
  quantity NUMERIC(18,3) NOT NULL CHECK (quantity > 0),
  refund_amount NUMERIC(18,2) NOT NULL,
  restock BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE cash_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES profiles(id),
  status cash_shift_status NOT NULL DEFAULT 'open',
  opening_cash NUMERIC(18,2) NOT NULL DEFAULT 0,
  expected_closing_cash NUMERIC(18,2),
  actual_closing_cash NUMERIC(18,2),
  variance NUMERIC(18,2),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closing_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_cash_shifts_open ON cash_shifts (cashier_id) WHERE status = 'open';

CREATE TABLE cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES cash_shifts(id),
  direction cash_movement_direction NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  payment_method payment_method_type,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  description TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  payment_method payment_method_type NOT NULL,
  payee TEXT,
  reference_number TEXT,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE owner_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  direction cash_movement_direction NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  payment_method payment_method_type NOT NULL DEFAULT 'cash',
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status purchase_order_status NOT NULL DEFAULT 'draft',
  ordered_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  ordered_quantity NUMERIC(18,3) NOT NULL CHECK (ordered_quantity > 0),
  unit_cost NUMERIC(18,2) NOT NULL CHECK (unit_cost >= 0),
  received_quantity NUMERIC(18,3) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0)
);

CREATE TABLE purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  receipt_number TEXT NOT NULL UNIQUE,
  received_by UUID NOT NULL REFERENCES profiles(id),
  idempotency_key TEXT UNIQUE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id UUID NOT NULL REFERENCES purchase_order_lines(id),
  quantity_received NUMERIC(18,3) NOT NULL CHECK (quantity_received > 0)
);

CREATE TABLE supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  invoice_number TEXT,
  amount NUMERIC(18,2) NOT NULL,
  amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
  invoice_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  invoice_id UUID REFERENCES supplier_invoices(id),
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  payment_method payment_method_type NOT NULL,
  payment_date DATE NOT NULL,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  sale_id UUID REFERENCES sales(id),
  amount_delta NUMERIC(18,2) NOT NULL,
  balance_after NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);

CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type TEXT NOT NULL,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  success_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE import_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  message TEXT NOT NULL,
  row_data JSONB
);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
