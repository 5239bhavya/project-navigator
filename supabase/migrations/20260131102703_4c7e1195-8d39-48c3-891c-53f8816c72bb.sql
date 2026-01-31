-- Fix search_path on helper functions for security
CREATE OR REPLACE FUNCTION public.get_contact_tag_ids(contact_id UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(tag_id), ARRAY[]::UUID[])
  FROM public.contact_tags
  WHERE contact_tags.contact_id = $1;
$$ LANGUAGE sql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_product_category_id(product_id UUID)
RETURNS UUID AS $$
  SELECT category_id FROM public.products WHERE id = $1;
$$ LANGUAGE sql STABLE SET search_path = public;