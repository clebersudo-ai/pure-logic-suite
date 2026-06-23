CREATE TABLE IF NOT EXISTS public.user_documento_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, categoria)
);
CREATE INDEX IF NOT EXISTS idx_user_documento_categorias_user ON public.user_documento_categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documento_categorias_categoria ON public.user_documento_categorias(categoria);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_documento_categorias TO authenticated;
GRANT ALL ON public.user_documento_categorias TO service_role;
ALTER TABLE public.user_documento_categorias ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_documento_categoria_access(_user_id UUID, _categoria TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'administrador')
    OR (_categoria IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_documento_categorias udc
      WHERE udc.user_id = _user_id AND udc.categoria = _categoria
    ));
$$;
GRANT EXECUTE ON FUNCTION public.has_documento_categoria_access(UUID, TEXT) TO authenticated;

DROP POLICY IF EXISTS "User categorias read" ON public.user_documento_categorias;
DROP POLICY IF EXISTS "User categorias insert" ON public.user_documento_categorias;
DROP POLICY IF EXISTS "User categorias update" ON public.user_documento_categorias;
DROP POLICY IF EXISTS "User categorias delete" ON public.user_documento_categorias;
CREATE POLICY "User categorias read" ON public.user_documento_categorias FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "User categorias insert" ON public.user_documento_categorias FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "User categorias update" ON public.user_documento_categorias FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "User categorias delete" ON public.user_documento_categorias FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

NOTIFY pgrst, 'reload schema';