CREATE TABLE IF NOT EXISTS public.user_documento_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, categoria)
);

CREATE INDEX IF NOT EXISTS idx_user_documento_categorias_user
  ON public.user_documento_categorias(user_id);

CREATE INDEX IF NOT EXISTS idx_user_documento_categorias_categoria
  ON public.user_documento_categorias(categoria);

ALTER TABLE public.user_documento_categorias ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_documento_categoria_access(_user_id UUID, _categoria TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'administrador')
    OR (
      _categoria IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_documento_categorias udc
        WHERE udc.user_id = _user_id
          AND udc.categoria = _categoria
      )
    );
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_documento_categorias TO authenticated;
GRANT ALL ON public.user_documento_categorias TO service_role;
GRANT EXECUTE ON FUNCTION public.has_documento_categoria_access(UUID, TEXT) TO authenticated;

DROP POLICY IF EXISTS "User categorias read" ON public.user_documento_categorias;
DROP POLICY IF EXISTS "User categorias insert" ON public.user_documento_categorias;
DROP POLICY IF EXISTS "User categorias update" ON public.user_documento_categorias;
DROP POLICY IF EXISTS "User categorias delete" ON public.user_documento_categorias;

CREATE POLICY "User categorias read"
  ON public.user_documento_categorias FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "User categorias insert"
  ON public.user_documento_categorias FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "User categorias update"
  ON public.user_documento_categorias FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "User categorias delete"
  ON public.user_documento_categorias FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "Doc read" ON public.documentos;
DROP POLICY IF EXISTS "Doc write" ON public.documentos;
DROP POLICY IF EXISTS "Doc update" ON public.documentos;
DROP POLICY IF EXISTS "Doc delete" ON public.documentos;

CREATE POLICY "Doc read"
  ON public.documentos FOR SELECT
  TO authenticated
  USING (public.has_documento_categoria_access(auth.uid(), categoria));

CREATE POLICY "Doc write"
  ON public.documentos FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'))
    AND public.has_documento_categoria_access(auth.uid(), categoria)
  );

CREATE POLICY "Doc update"
  ON public.documentos FOR UPDATE
  TO authenticated
  USING (
    (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'))
    AND public.has_documento_categoria_access(auth.uid(), categoria)
  )
  WITH CHECK (
    (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'))
    AND public.has_documento_categoria_access(auth.uid(), categoria)
  );

CREATE POLICY "Doc delete"
  ON public.documentos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'administrador'));

DROP POLICY IF EXISTS "DV read" ON public.documento_versoes;
DROP POLICY IF EXISTS "DV write" ON public.documento_versoes;
DROP POLICY IF EXISTS "DV delete" ON public.documento_versoes;

CREATE POLICY "DV read"
  ON public.documento_versoes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.documentos d
      WHERE d.id = documento_id
        AND public.has_documento_categoria_access(auth.uid(), d.categoria)
    )
  );

CREATE POLICY "DV write"
  ON public.documento_versoes FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'))
    AND EXISTS (
      SELECT 1
      FROM public.documentos d
      WHERE d.id = documento_id
        AND public.has_documento_categoria_access(auth.uid(), d.categoria)
    )
  );

CREATE POLICY "DV delete"
  ON public.documento_versoes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'administrador'));

DROP POLICY IF EXISTS "DA read" ON public.documento_anexos;
DROP POLICY IF EXISTS "DA write" ON public.documento_anexos;
DROP POLICY IF EXISTS "DA delete" ON public.documento_anexos;

CREATE POLICY "DA read"
  ON public.documento_anexos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.documentos d
      WHERE d.id = documento_id
        AND public.has_documento_categoria_access(auth.uid(), d.categoria)
    )
  );

CREATE POLICY "DA write"
  ON public.documento_anexos FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'))
    AND EXISTS (
      SELECT 1
      FROM public.documentos d
      WHERE d.id = documento_id
        AND public.has_documento_categoria_access(auth.uid(), d.categoria)
    )
  );

CREATE POLICY "DA delete"
  ON public.documento_anexos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'administrador'));

DROP POLICY IF EXISTS "Documento demandas read" ON public.documento_demandas;
DROP POLICY IF EXISTS "Documento demandas write" ON public.documento_demandas;
DROP POLICY IF EXISTS "Documento demandas update" ON public.documento_demandas;
DROP POLICY IF EXISTS "Documento demandas delete" ON public.documento_demandas;

CREATE POLICY "Documento demandas read"
  ON public.documento_demandas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.documentos d
      WHERE d.id = documento_id
        AND public.has_documento_categoria_access(auth.uid(), d.categoria)
    )
  );

CREATE POLICY "Documento demandas write"
  ON public.documento_demandas FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'))
    AND EXISTS (
      SELECT 1
      FROM public.documentos d
      WHERE d.id = documento_id
        AND public.has_documento_categoria_access(auth.uid(), d.categoria)
    )
  );

CREATE POLICY "Documento demandas update"
  ON public.documento_demandas FOR UPDATE
  TO authenticated
  USING (
    (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'))
    AND EXISTS (
      SELECT 1
      FROM public.documentos d
      WHERE d.id = documento_id
        AND public.has_documento_categoria_access(auth.uid(), d.categoria)
    )
  );

CREATE POLICY "Documento demandas delete"
  ON public.documento_demandas FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'administrador'));

NOTIFY pgrst, 'reload schema';
