CREATE TABLE IF NOT EXISTS public.laboratorio_reagentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'reagente',
  fabricante TEXT,
  lote TEXT,
  cas TEXT,
  classe_risco TEXT,
  grupo_compatibilidade TEXT,
  incompatibilidades TEXT,
  local_armazenamento TEXT,
  quantidade NUMERIC,
  unidade TEXT DEFAULT 'un',
  data_recebimento DATE,
  data_abertura DATE,
  data_validade DATE,
  responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.laboratorio_vidrarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item TEXT NOT NULL,
  codigo TEXT,
  capacidade TEXT,
  quantidade_total INTEGER NOT NULL DEFAULT 0,
  quantidade_disponivel INTEGER NOT NULL DEFAULT 0,
  local_armazenamento TEXT,
  requer_calibracao BOOLEAN NOT NULL DEFAULT false,
  data_calibracao DATE,
  proxima_calibracao DATE,
  status TEXT NOT NULL DEFAULT 'disponivel',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.laboratorio_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT,
  fabricante TEXT,
  modelo TEXT,
  numero_serie TEXT,
  local_instalacao TEXT,
  responsavel TEXT,
  frequencia_calibracao_dias INTEGER,
  ultima_calibracao DATE,
  proxima_calibracao DATE,
  ultima_manutencao DATE,
  proxima_manutencao DATE,
  status TEXT NOT NULL DEFAULT 'operacional',
  certificado TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.laboratorio_descartes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  material TEXT NOT NULL,
  origem TEXT,
  quantidade NUMERIC,
  unidade TEXT DEFAULT 'un',
  classe_residuo TEXT,
  risco TEXT,
  recipiente TEXT,
  data_geracao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_descarte DATE,
  responsavel TEXT,
  destino TEXT,
  status TEXT NOT NULL DEFAULT 'armazenado',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.laboratorio_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'registro',
  codigo TEXT,
  amostra_id UUID,
  local_arquivo TEXT,
  data_documento DATE,
  reter_ate DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  responsavel TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.laboratorio_reagentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratorio_vidrarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratorio_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratorio_descartes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratorio_arquivos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'laboratorio_reagentes',
    'laboratorio_vidrarias',
    'laboratorio_equipamentos',
    'laboratorio_descartes',
    'laboratorio_arquivos'
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
