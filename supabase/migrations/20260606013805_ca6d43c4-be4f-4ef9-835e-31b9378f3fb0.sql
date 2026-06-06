ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS subcategoria text;
CREATE INDEX IF NOT EXISTS idx_documentos_subcategoria ON public.documentos(subcategoria);