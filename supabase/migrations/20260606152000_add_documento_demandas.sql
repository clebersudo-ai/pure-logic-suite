CREATE TABLE IF NOT EXISTS public.documento_demandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel TEXT,
  data_limite DATE,
  status TEXT NOT NULL DEFAULT 'aberta',
  concluida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documento_demandas_documento ON public.documento_demandas(documento_id);
CREATE INDEX IF NOT EXISTS idx_documento_demandas_responsavel ON public.documento_demandas(responsavel);
CREATE INDEX IF NOT EXISTS idx_documento_demandas_data_limite ON public.documento_demandas(data_limite);

CREATE UNIQUE INDEX IF NOT EXISTS idx_documento_demandas_abertas_documento
  ON public.documento_demandas(documento_id)
  WHERE status IN ('aberta', 'em_andamento');

ALTER TABLE public.documento_demandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documento demandas read" ON public.documento_demandas FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));
CREATE POLICY "Documento demandas write" ON public.documento_demandas FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'));
CREATE POLICY "Documento demandas update" ON public.documento_demandas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'));
CREATE POLICY "Documento demandas delete" ON public.documento_demandas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrador'));

CREATE TRIGGER documento_demandas_updated
  BEFORE UPDATE ON public.documento_demandas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
