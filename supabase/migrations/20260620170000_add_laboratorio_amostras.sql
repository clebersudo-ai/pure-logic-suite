CREATE TABLE IF NOT EXISTS public.laboratorio_amostras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  material TEXT NOT NULL,
  origem TEXT,
  lote TEXT,
  prioridade TEXT NOT NULL DEFAULT 'normal',
  etapa TEXT NOT NULL DEFAULT 'recebimento',
  status TEXT NOT NULL DEFAULT 'aguardando',
  prazo_resposta DATE,
  responsavel TEXT,
  metodo TEXT,
  especificacao TEXT,
  resultado TEXT,
  parecer TEXT,
  observacoes TEXT,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT laboratorio_amostras_prioridade_check CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  CONSTRAINT laboratorio_amostras_etapa_check CHECK (etapa IN ('recebimento', 'registro', 'plano_ensaio', 'preparacao', 'analise', 'revisao', 'liberacao', 'arquivo')),
  CONSTRAINT laboratorio_amostras_status_check CHECK (status IN ('aguardando', 'em_andamento', 'em_revisao', 'aprovada', 'reprovada', 'arquivada'))
);

ALTER TABLE public.laboratorio_amostras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Laboratorio amostras read"
ON public.laboratorio_amostras
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Laboratorio amostras insert"
ON public.laboratorio_amostras
FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Laboratorio amostras update"
ON public.laboratorio_amostras
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid()))
WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Laboratorio amostras delete"
ON public.laboratorio_amostras
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'));

CREATE OR REPLACE FUNCTION public.set_laboratorio_amostras_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_laboratorio_amostras_updated_at ON public.laboratorio_amostras;
CREATE TRIGGER set_laboratorio_amostras_updated_at
BEFORE UPDATE ON public.laboratorio_amostras
FOR EACH ROW
EXECUTE FUNCTION public.set_laboratorio_amostras_updated_at();
