CREATE TABLE IF NOT EXISTS public.qualidade_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'POP',
  area_responsavel TEXT,
  setor_aplicavel TEXT,
  versao_atual TEXT NOT NULL DEFAULT '1.0',
  data_emissao DATE,
  proxima_revisao DATE,
  elaborado_por TEXT,
  aprovado_por TEXT,
  status TEXT NOT NULL DEFAULT 'em_elaboracao',
  criticidade TEXT NOT NULL DEFAULT 'media',
  local_aplicacao TEXT,
  treinamento_obrigatorio BOOLEAN NOT NULL DEFAULT false,
  arquivo_nome TEXT,
  arquivo_url TEXT,
  observacoes TEXT,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT qualidade_documentos_status_check CHECK (status IN ('em_elaboracao', 'em_revisao', 'aprovado', 'obsoleto', 'arquivo_morto')),
  CONSTRAINT qualidade_documentos_criticidade_check CHECK (criticidade IN ('baixa', 'media', 'alta', 'critica'))
);

CREATE TABLE IF NOT EXISTS public.qualidade_documento_versoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES public.qualidade_documentos(id) ON DELETE CASCADE,
  versao TEXT NOT NULL,
  data_versao DATE NOT NULL DEFAULT CURRENT_DATE,
  resumo_alteracao TEXT,
  arquivo_nome TEXT,
  arquivo_url TEXT,
  responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'vigente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qualidade_treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID REFERENCES public.qualidade_documentos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  publico_alvo TEXT,
  responsavel TEXT,
  data_prevista DATE,
  data_realizada DATE,
  validade_treinamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  evidencias TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.qualidade_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualidade_documento_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualidade_treinamentos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'qualidade_documentos',
    'qualidade_documento_versoes',
    'qualidade_treinamentos'
  ]
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name AND policyname = table_name || ' read') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()))', table_name || ' read', table_name);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name AND policyname = table_name || ' write') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_any_role(auth.uid())) WITH CHECK (public.has_any_role(auth.uid()))', table_name || ' write', table_name);
    END IF;
  END LOOP;
END;
$$;
