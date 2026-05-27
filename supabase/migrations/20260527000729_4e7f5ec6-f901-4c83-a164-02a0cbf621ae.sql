
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT,
  ADD COLUMN IF NOT EXISTS validado_ia BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS validado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_documentos_cnpj ON public.documentos(cnpj);
CREATE INDEX IF NOT EXISTS idx_documentos_numero ON public.documentos(numero_documento);
