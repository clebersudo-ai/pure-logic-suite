-- Ensure the dynamic document option table exists in environments where the
-- original migration was not applied or PostgREST still has an old schema cache.
CREATE TABLE IF NOT EXISTS public.documento_opcoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL,
    valor TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tipo, valor)
);

ALTER TABLE public.documento_opcoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documento_opcoes' AND policyname = 'Allow authenticated users to read documento_opcoes'
  ) THEN
    CREATE POLICY "Allow authenticated users to read documento_opcoes"
    ON public.documento_opcoes FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documento_opcoes' AND policyname = 'Allow managers to manage documento_opcoes'
  ) THEN
    CREATE POLICY "Allow managers to manage documento_opcoes"
    ON public.documento_opcoes FOR ALL
    TO authenticated
    USING (
      public.has_role(auth.uid(), 'administrador') OR
      public.has_role(auth.uid(), 'comercial')
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'administrador') OR
      public.has_role(auth.uid(), 'comercial')
    );
  END IF;
END $$;

INSERT INTO public.documento_opcoes (tipo, valor, label) VALUES
('categoria', 'Licença Ambiental', 'Licença Ambiental'),
('categoria', 'Sanitária', 'Sanitária'),
('categoria', 'Bombeiros', 'Bombeiros'),
('categoria', 'Fiscal', 'Fiscal'),
('categoria', 'Trabalhista', 'Trabalhista'),
('categoria', 'Qualidade', 'Qualidade'),
('categoria', 'RH', 'RH'),
('categoria', 'ANVISA', 'ANVISA'),
('categoria', 'IBAMA', 'IBAMA'),
('categoria', 'Outros', 'Outros'),
('orgao', 'ANVISA', 'ANVISA'),
('orgao', 'IBAMA', 'IBAMA'),
('orgao', 'CETESB', 'CETESB'),
('orgao', 'Vigilância Sanitária', 'Vigilância Sanitária'),
('orgao', 'Corpo de Bombeiros', 'Corpo de Bombeiros'),
('orgao', 'Receita Federal', 'Receita Federal'),
('orgao', 'Prefeitura', 'Prefeitura'),
('orgao', 'Ministério do Trabalho', 'Ministério do Trabalho'),
('orgao', 'Outros', 'Outros'),
('status', 'ativo', 'Ativo'),
('status', 'em_renovacao', 'Em renovação'),
('status', 'arquivado', 'Arquivado'),
('vencimento', 'vencido', 'Já vencidos'),
('vencimento', '30', 'Em 30 dias'),
('vencimento', '60', 'Em 60 dias'),
('vencimento', '90', 'Em 90 dias')
ON CONFLICT (tipo, valor) DO NOTHING;

INSERT INTO public.documento_opcoes (tipo, valor, label)
SELECT DISTINCT 'responsavel', responsavel, responsavel
FROM public.documentos
WHERE responsavel IS NOT NULL AND responsavel != ''
ON CONFLICT (tipo, valor) DO NOTHING;

-- RLS policies call these helpers while authenticated users insert/update rows.
-- After revoking PUBLIC execute, authenticated needs an explicit grant.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid) TO authenticated;

-- Ask PostgREST/Supabase API to refresh its schema cache after creating the table.
NOTIFY pgrst, 'reload schema';
