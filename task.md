# Planejamento e Instruções de Desenvolvimento: Módulo de Documentos

> [!IMPORTANT]
> **TAREFA PRIORITÁRIA DE TESTE (EXECUTAR AGORA):**
> - [ ] **Mudar a cor de fundo da tela principal do sistema para Verde**
>   * **Onde alterar:** No arquivo `src/styles.css` (linha 55), mude a variável `--background` da raiz `:root` de `oklch(0.985 0.003 240)` (azul muito claro) para um tom de verde muito claro e suave, como `oklch(0.985 0.015 145)`.
>   * **Objetivo:** Confirmar que as alterações feitas na sua máquina estão refletindo corretamente no Google Drive e no GitHub.

---

## 📋 Lista de Tarefas Pendentes (Aguardando Liberação)

### 1. Reorganização das Categorias e Subcategorias
A árvore de pastas (categorias e subcategorias) no arquivo `src/routes/documentos.tsx` (objeto `CATEGORIAS_TREE`) deve ser reestruturada exatamente conforme as definições abaixo:

- [ ] **EMPRESARIAL**
  - Contrato Social
  - Alterações Contratuais
  - CNPJ
  - Inscrição Estadual
  - Inscrição Municipal
  - Certificados Digitais
- [ ] **REGULATÓRIO**
  - AFE – ANVISA
  - CRQ
  - CETESB
  - CADRI
  - IBAMA
  - Controle de Resíduos (simplificar nome, retirando "- CETESB")
  - Vigilância Sanitária Municipal
  - VRE / Viabilidade Empresarial (renomear de "Via Rápida Empresa")
  - Corpo de Bombeiros
  - Prefeitura / Alvará (renomear de "Alvará de Funcionamento Prefeitura")
- [ ] **SEGURANÇA E SST** (Nova categoria principal)
  - PGR
  - PCMSO
  - LTCAT
  - ASO
- [ ] **PRODUTOS CONTROLADOS** (Nova categoria principal)
  - Polícia Civil
  - Polícia Federal
  - Exército
  - MAPA Produtos Controlados
- [ ] **QUALIDADE**
  - POP
  - IT
  - Manual da Qualidade
  - Registros CQ
  - FISPQ
  - Boletins Técnicos
- [ ] **RH / ADMINISTRATIVO** (Fusão de Administrativo e Trabalhista)
  - Contratos
  - Procurações
  - Documentos Funcionários
  - Prestadores
- [ ] **FISCAL / CONTÁBIL**
  - Certidões
  - Débitos
  - Balancetes
  - SPED
  - Simples Nacional
