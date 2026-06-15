UPDATE public.documentos
SET status = CASE status
  WHEN 'em_renovacao' THEN CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.documento_versoes dv
      WHERE dv.documento_id = documentos.id
        AND LOWER(COALESCE(dv.nome_arquivo, '')) SIMILAR TO '%(protocolo|recibo|comprovante|protocolado)%'
    ) OR EXISTS (
      SELECT 1
      FROM public.documento_anexos da
      WHERE da.documento_id = documentos.id
        AND LOWER(COALESCE(da.nome_arquivo, '')) SIMILAR TO '%(protocolo|recibo|comprovante|protocolado)%'
    )
    THEN 'protocolo_enviado'
    ELSE 'renovacao_iniciada'
  END
  WHEN 'inativo_temporario' THEN 'inativo'
  WHEN 'inativo_definitivo' THEN 'inativo'
  ELSE status
END
WHERE status IN ('em_renovacao', 'inativo_temporario', 'inativo_definitivo');

DELETE FROM public.documento_opcoes
WHERE tipo = 'status'
  AND valor IN ('em_renovacao', 'inativo_temporario', 'inativo_definitivo');

INSERT INTO public.documento_opcoes (tipo, valor, label)
VALUES
  ('status', 'ativo', 'Ativo'),
  ('status', 'renovacao_iniciada', 'Renovação iniciada'),
  ('status', 'protocolo_enviado', 'Protocolo enviado'),
  ('status', 'em_analise_orgao', 'Em análise pelo órgão'),
  ('status', 'exigencia_pendente', 'Exigência pendente'),
  ('status', 'aguardando_nova_licenca', 'Aguardando nova licença'),
  ('status', 'licenca_renovada', 'Licença renovada'),
  ('status', 'indeferido', 'Indeferido'),
  ('status', 'suspenso', 'Suspenso'),
  ('status', 'inativo', 'Inativo'),
  ('status', 'arquivado', 'Arquivado')
ON CONFLICT (tipo, valor) DO UPDATE
SET label = EXCLUDED.label;

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
      AND d.status IN ('ativo', 'licenca_renovada')
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

REVOKE ALL ON FUNCTION public.gerar_demandas_documentos_recorrentes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gerar_demandas_documentos_recorrentes() TO service_role;
