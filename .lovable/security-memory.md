# Security Memory

## Ignored findings (intentional)

- **SUPA_authenticated_security_definer_function_executable** (WARN) — Aplicado às funções `public.has_role(uuid, app_role)` e `public.has_any_role(uuid)`. São `SECURITY DEFINER` por design (padrão recomendado pelo Supabase para evitar recursão em RLS) e devem permanecer executáveis pelo papel `authenticated` porque são invocadas dentro das policies RLS (`public.has_role(auth.uid(), 'administrador')`, etc.). Revogar EXECUTE quebra o RLS de toda a aplicação. Não sinalizar novamente para essas duas funções.

## Convenções

- Toda nova função `SECURITY DEFINER` que NÃO precisa ser chamada de policies RLS deve ter EXECUTE revogado de `PUBLIC`, `anon` e `authenticated`, e concedido apenas a `service_role` (exemplo: `public.gerar_demandas_documentos_recorrentes()`).
- Funções utilitárias usadas em RLS (`has_role`, `has_any_role`) são exceção justificada.
