
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  versao_atual INTEGER NOT NULL DEFAULT 1,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.documento_versoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  observacoes TEXT,
  enviado_por UUID,
  enviado_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.documento_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  observacoes TEXT,
  enviado_por UUID,
  enviado_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_versoes_doc ON public.documento_versoes(documento_id);
CREATE INDEX idx_doc_anexos_doc ON public.documento_anexos(documento_id);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doc read" ON public.documentos FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));
CREATE POLICY "Doc write" ON public.documentos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'));
CREATE POLICY "Doc update" ON public.documentos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'));
CREATE POLICY "Doc delete" ON public.documentos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrador'));

CREATE POLICY "DV read" ON public.documento_versoes FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));
CREATE POLICY "DV write" ON public.documento_versoes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'));
CREATE POLICY "DV delete" ON public.documento_versoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrador'));

CREATE POLICY "DA read" ON public.documento_anexos FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));
CREATE POLICY "DA write" ON public.documento_anexos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'));
CREATE POLICY "DA delete" ON public.documento_anexos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrador'));

CREATE TRIGGER documentos_updated
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('documentos','documentos', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Documentos bucket read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND public.has_any_role(auth.uid()));
CREATE POLICY "Documentos bucket write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial')));
CREATE POLICY "Documentos bucket update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos' AND (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial')));
CREATE POLICY "Documentos bucket delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND public.has_role(auth.uid(),'administrador'));
