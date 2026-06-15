INSERT INTO public.documento_opcoes (tipo, valor, label)
VALUES
  ('status', 'inativo_temporario', 'Inativo temporário'),
  ('status', 'inativo_definitivo', 'Inativo definitivo')
ON CONFLICT (tipo, valor) DO UPDATE
SET label = EXCLUDED.label;
