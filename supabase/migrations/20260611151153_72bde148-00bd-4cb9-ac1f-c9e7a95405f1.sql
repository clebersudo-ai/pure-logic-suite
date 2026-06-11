
REVOKE ALL ON FUNCTION public.gerar_demandas_documentos_recorrentes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gerar_demandas_documentos_recorrentes() FROM anon;
REVOKE ALL ON FUNCTION public.gerar_demandas_documentos_recorrentes() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_demandas_documentos_recorrentes() TO service_role;

REVOKE ALL ON FUNCTION public.proxima_data_recorrente(date, text, integer, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.proxima_data_recorrente(date, text, integer, text, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.proxima_data_recorrente(date, text, integer, text, timestamptz) FROM authenticated;
