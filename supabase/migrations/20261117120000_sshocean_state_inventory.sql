-- SSHOcean provisions by US state. Orders record the state the customer picked,
-- and availability counts can filter on proxies.region (the USPS code).

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS state_code TEXT;
CREATE INDEX IF NOT EXISTS orders_state_code_idx ON public.orders (state_code);
CREATE INDEX IF NOT EXISTS proxies_region_idx ON public.proxies (region);
CREATE INDEX IF NOT EXISTS proxies_source_idx ON public.proxies (source);

-- Replace the 3-arg function so callers can pass a state without keeping an overload.
DROP FUNCTION IF EXISTS public.count_available_proxies(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.count_available_proxies(
  p_country TEXT DEFAULT NULL,
  p_proxy_type TEXT DEFAULT NULL,
  p_auth_type TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM public.proxies
  WHERE status = 'available'
    AND (p_country IS NULL OR country = p_country)
    AND (p_proxy_type IS NULL OR proxy_type = p_proxy_type)
    AND (p_auth_type IS NULL OR auth_type = p_auth_type)
    AND (p_region IS NULL OR region = p_region)
    AND NOT blacklist;
$$;

GRANT EXECUTE ON FUNCTION public.count_available_proxies(TEXT, TEXT, TEXT, TEXT) TO service_role;
