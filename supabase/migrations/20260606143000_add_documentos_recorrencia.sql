ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS atualizacao_recorrente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intervalo_atualizacao_dias integer,
  ADD COLUMN IF NOT EXISTS proxima_atualizacao date;

CREATE INDEX IF NOT EXISTS idx_documentos_proxima_atualizacao
  ON public.documentos(proxima_atualizacao)
  WHERE atualizacao_recorrente = true;
