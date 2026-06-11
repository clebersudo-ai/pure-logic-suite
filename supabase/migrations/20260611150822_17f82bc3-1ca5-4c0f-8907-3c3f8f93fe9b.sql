
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS atualizacao_recorrente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intervalo_atualizacao_dias integer,
  ADD COLUMN IF NOT EXISTS proxima_atualizacao date,
  ADD COLUMN IF NOT EXISTS recorrencia_tipo text,
  ADD COLUMN IF NOT EXISTS recorrencia_dia_base integer,
  ADD COLUMN IF NOT EXISTS recorrencia_mensal_modo text;

CREATE INDEX IF NOT EXISTS idx_documentos_proxima_atualizacao
  ON public.documentos(proxima_atualizacao) WHERE atualizacao_recorrente = true;

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documento_demandas TO authenticated;
GRANT ALL ON public.documento_demandas TO service_role;

CREATE INDEX IF NOT EXISTS idx_documento_demandas_documento ON public.documento_demandas(documento_id);
CREATE INDEX IF NOT EXISTS idx_documento_demandas_responsavel ON public.documento_demandas(responsavel);
CREATE INDEX IF NOT EXISTS idx_documento_demandas_data_limite ON public.documento_demandas(data_limite);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documento_demandas_abertas_data
  ON public.documento_demandas(documento_id, data_limite)
  WHERE status IN ('aberta', 'em_andamento');

ALTER TABLE public.documento_demandas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='documento_demandas' AND policyname='Documento demandas read') THEN
    CREATE POLICY "Documento demandas read" ON public.documento_demandas FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='documento_demandas' AND policyname='Documento demandas write') THEN
    CREATE POLICY "Documento demandas write" ON public.documento_demandas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='documento_demandas' AND policyname='Documento demandas update') THEN
    CREATE POLICY "Documento demandas update" ON public.documento_demandas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='documento_demandas' AND policyname='Documento demandas delete') THEN
    CREATE POLICY "Documento demandas delete" ON public.documento_demandas FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS documento_demandas_updated ON public.documento_demandas;
CREATE TRIGGER documento_demandas_updated BEFORE UPDATE ON public.documento_demandas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.proxima_data_recorrente(
  p_apos date, p_tipo text, p_dia_base integer, p_modo_mensal text, p_criado_em timestamptz
) RETURNS date LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  v_tipo text := COALESCE(p_tipo, 'mensal');
  v_dia integer;
  v_candidata date;
  v_inicio date := COALESCE(p_criado_em::date, p_apos);
  v_ciclos integer;
BEGIN
  IF v_tipo = 'diaria' THEN RETURN p_apos + 1; END IF;
  IF v_tipo = 'quinzenal' THEN
    v_dia := LEAST(GREATEST(COALESCE(p_dia_base, 15), 1), 15);
    v_candidata := make_date(EXTRACT(YEAR FROM p_apos)::integer, EXTRACT(MONTH FROM p_apos)::integer,
      LEAST(v_dia, EXTRACT(DAY FROM (date_trunc('month', p_apos) + interval '1 month - 1 day'))::integer));
    IF v_candidata > p_apos THEN RETURN v_candidata; END IF;
    v_candidata := make_date(EXTRACT(YEAR FROM p_apos)::integer, EXTRACT(MONTH FROM p_apos)::integer,
      LEAST(v_dia + 15, EXTRACT(DAY FROM (date_trunc('month', p_apos) + interval '1 month - 1 day'))::integer));
    IF v_candidata > p_apos THEN RETURN v_candidata; END IF;
    v_candidata := (date_trunc('month', p_apos) + interval '1 month')::date;
    RETURN make_date(EXTRACT(YEAR FROM v_candidata)::integer, EXTRACT(MONTH FROM v_candidata)::integer,
      LEAST(v_dia, EXTRACT(DAY FROM (date_trunc('month', v_candidata) + interval '1 month - 1 day'))::integer));
  END IF;
  IF p_modo_mensal = 'data_cadastro' THEN
    v_ciclos := GREATEST(0, ((p_apos - v_inicio) / 30) + 1);
    v_candidata := v_inicio + (v_ciclos * 30);
    WHILE v_candidata <= p_apos LOOP v_candidata := v_candidata + 30; END LOOP;
    RETURN v_candidata;
  END IF;
  v_dia := LEAST(GREATEST(COALESCE(p_dia_base, 1), 1), 31);
  v_candidata := make_date(EXTRACT(YEAR FROM p_apos)::integer, EXTRACT(MONTH FROM p_apos)::integer,
    LEAST(v_dia, EXTRACT(DAY FROM (date_trunc('month', p_apos) + interval '1 month - 1 day'))::integer));
  IF v_candidata > p_apos THEN RETURN v_candidata; END IF;
  v_candidata := (date_trunc('month', p_apos) + interval '1 month')::date;
  RETURN make_date(EXTRACT(YEAR FROM v_candidata)::integer, EXTRACT(MONTH FROM v_candidata)::integer,
    LEAST(v_dia, EXTRACT(DAY FROM (date_trunc('month', v_candidata) + interval '1 month - 1 day'))::integer));
END; $$;

CREATE OR REPLACE FUNCTION public.gerar_demandas_documentos_recorrentes()
RETURNS TABLE (
  out_documento_id uuid,
  out_documento_nome text,
  out_demanda_id uuid,
  out_data_limite date,
  out_responsavel text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_documento public.documentos%ROWTYPE;
  v_abertas integer;
  v_cursor date;
  v_data date;
  v_demanda_id uuid;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('gerar_demandas_documentos_recorrentes')) THEN RETURN; END IF;

  FOR v_documento IN
    SELECT d.* FROM public.documentos d
    WHERE d.atualizacao_recorrente = true
      AND d.status = 'ativo'
      AND NULLIF(BTRIM(d.responsavel), '') IS NOT NULL
    ORDER BY d.id
  LOOP
    SELECT COUNT(*), GREATEST(CURRENT_DATE, COALESCE(MAX(dd.data_limite), CURRENT_DATE))
      INTO v_abertas, v_cursor
    FROM public.documento_demandas dd
    WHERE dd.documento_id = v_documento.id AND dd.status IN ('aberta', 'em_andamento');

    WHILE v_abertas < 2 LOOP
      v_data := public.proxima_data_recorrente(
        v_cursor, v_documento.recorrencia_tipo, v_documento.recorrencia_dia_base,
        v_documento.recorrencia_mensal_modo, v_documento.created_at
      );

      INSERT INTO public.documento_demandas (documento_id, titulo, descricao, responsavel, data_limite, status)
      VALUES (
        v_documento.id,
        'Atualizar documento: ' || v_documento.nome,
        'Demanda gerada automaticamente pela recorrencia do documento ' || v_documento.nome || '.',
        v_documento.responsavel, v_data, 'aberta'
      )
      ON CONFLICT (documento_id, data_limite) WHERE status IN ('aberta', 'em_andamento')
      DO NOTHING
      RETURNING id INTO v_demanda_id;

      v_cursor := v_data;
      IF v_demanda_id IS NOT NULL THEN
        v_abertas := v_abertas + 1;
        out_documento_id := v_documento.id;
        out_documento_nome := v_documento.nome;
        out_demanda_id := v_demanda_id;
        out_data_limite := v_data;
        out_responsavel := v_documento.responsavel;
        RETURN NEXT;
        v_demanda_id := NULL;
      END IF;
    END LOOP;

    UPDATE public.documentos d
    SET proxima_atualizacao = (
      SELECT MIN(dd.data_limite) FROM public.documento_demandas dd
      WHERE dd.documento_id = v_documento.id AND dd.status IN ('aberta', 'em_andamento')
    )
    WHERE d.id = v_documento.id
      AND d.proxima_atualizacao IS DISTINCT FROM (
        SELECT MIN(dd.data_limite) FROM public.documento_demandas dd
        WHERE dd.documento_id = v_documento.id AND dd.status IN ('aberta', 'em_andamento')
      );
  END LOOP;
END; $$;

REVOKE ALL ON FUNCTION public.proxima_data_recorrente(date, text, integer, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gerar_demandas_documentos_recorrentes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gerar_demandas_documentos_recorrentes() TO service_role;

DO $$
DECLARE v_job_id bigint;
BEGIN
  FOR v_job_id IN SELECT jobid FROM cron.job WHERE jobname = 'gerar-demandas-documentos-recorrentes' LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
  PERFORM cron.schedule('gerar-demandas-documentos-recorrentes', '0 6 * * *',
    'SELECT public.gerar_demandas_documentos_recorrentes();');
END; $$;

SELECT * FROM public.gerar_demandas_documentos_recorrentes();
