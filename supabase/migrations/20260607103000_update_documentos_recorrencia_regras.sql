ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS atualizacao_recorrente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intervalo_atualizacao_dias integer,
  ADD COLUMN IF NOT EXISTS proxima_atualizacao date,
  ADD COLUMN IF NOT EXISTS recorrencia_tipo text,
  ADD COLUMN IF NOT EXISTS recorrencia_dia_base integer,
  ADD COLUMN IF NOT EXISTS recorrencia_mensal_modo text;

DROP INDEX IF EXISTS idx_documento_demandas_abertas_documento;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documento_demandas_abertas_data
  ON public.documento_demandas(documento_id, data_limite)
  WHERE status IN ('aberta', 'em_andamento');
