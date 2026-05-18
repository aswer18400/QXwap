-- Pin the search_path for the items full-text search trigger function.
--
-- Removes the Supabase advisor's `function_search_path_mutable` warning. The
-- function is SECURITY INVOKER (so it runs with the caller's privileges) but
-- still benefits from an explicit search_path to prevent search-path-based
-- injection if a caller ever sets an unexpected schema first.

ALTER FUNCTION public.items_search_vector_update()
  SET search_path = pg_catalog, public;
