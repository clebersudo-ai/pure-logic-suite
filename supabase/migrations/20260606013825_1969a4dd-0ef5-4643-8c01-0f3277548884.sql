CREATE TABLE IF NOT EXISTS public.documento_opcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  valor text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tipo, valor)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documento_opcoes TO authenticated;
GRANT ALL ON public.documento_opcoes TO service_role;
ALTER TABLE public.documento_opcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Opcoes read" ON public.documento_opcoes FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Opcoes write" ON public.documento_opcoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'));
CREATE POLICY "Opcoes update" ON public.documento_opcoes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial'));
CREATE POLICY "Opcoes delete" ON public.documento_opcoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));
CREATE TRIGGER documento_opcoes_updated BEFORE UPDATE ON public.documento_opcoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();