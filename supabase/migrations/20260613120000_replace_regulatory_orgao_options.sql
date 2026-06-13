-- Replace regulatory authority options with the approved list.
UPDATE public.documentos
SET orgao_emissor = CASE orgao_emissor
  WHEN 'ANVISA' THEN 'Anvisa'
  WHEN 'CETESB' THEN 'Cetesb'
  WHEN 'Corpo de Bombeiros' THEN 'Corpo de Bombeiro'
  WHEN 'Polícia Civil' THEN 'Policia Civil'
  WHEN 'Polícia Federal' THEN 'Policia Federal'
  WHEN 'VRE / Via Rápida Empresa' THEN 'VRE / SIL'
  ELSE orgao_emissor
END
WHERE orgao_emissor IN (
  'ANVISA',
  'CETESB',
  'Corpo de Bombeiros',
  'Polícia Civil',
  'Polícia Federal',
  'VRE / Via Rápida Empresa'
);

DELETE FROM public.documento_opcoes
WHERE tipo = 'orgao';

INSERT INTO public.documento_opcoes (tipo, valor, label) VALUES
('orgao', 'Policia Civil', 'Policia Civil'),
('orgao', 'Policia Federal', 'Policia Federal'),
('orgao', 'Exército', 'Exército'),
('orgao', 'Anvisa', 'Anvisa'),
('orgao', 'Vigilância Sanitária', 'Vigilância Sanitária'),
('orgao', 'IBAMA', 'IBAMA'),
('orgao', 'Corpo de Bombeiro', 'Corpo de Bombeiro'),
('orgao', 'VRE / SIL', 'VRE / SIL'),
('orgao', 'Cetesb', 'Cetesb'),
('orgao', 'CADRI', 'CADRI'),
('orgao', 'Prefeitura', 'Prefeitura'),
('orgao', 'Outros', 'Outros')
ON CONFLICT (tipo, valor) DO UPDATE
SET label = EXCLUDED.label;

NOTIFY pgrst, 'reload schema';
