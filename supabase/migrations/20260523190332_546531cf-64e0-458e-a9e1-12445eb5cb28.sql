
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS orgao_emissor text,
  ADD COLUMN IF NOT EXISTS numero_documento text,
  ADD COLUMN IF NOT EXISTS empresa text,
  ADD COLUMN IF NOT EXISTS unidade text,
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS data_emissao date,
  ADD COLUMN IF NOT EXISTS data_validade date,
  ADD COLUMN IF NOT EXISTS renovacao_obrigatoria boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS criticidade text NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS observacoes text;

CREATE INDEX IF NOT EXISTS idx_documentos_validade ON public.documentos(data_validade);
CREATE INDEX IF NOT EXISTS idx_documentos_categoria ON public.documentos(categoria);
CREATE INDEX IF NOT EXISTS idx_documentos_orgao ON public.documentos(orgao_emissor);
