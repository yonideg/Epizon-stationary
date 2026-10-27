CREATE OR REPLACE FUNCTION public.next_transaction_number(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  seq BIGINT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq FROM sales WHERE business_date = (now() AT TIME ZONE 'Africa/Addis_Ababa')::date;
  RETURN prefix || to_char(now() AT TIME ZONE 'Africa/Addis_Ababa', 'YYYYMMDD') || '-' || lpad(seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.business_date_addis(ts TIMESTAMPTZ DEFAULT now())
RETURNS DATE AS $$
  SELECT (ts AT TIME ZONE 'Africa/Addis_Ababa')::date;
$$ LANGUAGE sql STABLE;
