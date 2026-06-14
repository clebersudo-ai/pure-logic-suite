# Planejamento e Instruções de Desenvolvimento: Módulo de Documentos

Este arquivo serve como o direcionamento oficial de tarefas para a implementação das melhorias no módulo de **Controle Regulatório (Documentos)**. 

> [!IMPORTANT]
> **DIRETRIZ DE SEGURANÇA PARA O CODEX:**
> As alterações devem ser feitas **apenas no módulo de documentos** (principalmente no arquivo `src/routes/documentos.tsx` e dependências diretas). Não altere arquivos dos módulos de estoque, formulações ou ordens de produção, a menos que seja estritamente necessário para o funcionamento do módulo de documentos.

---

## 📋 Lista de Tarefas (Checklist)

### 1. Reorganização das Categorias e Subcategorias
A árvore de pastas (categorias e subcategorias) no arquivo `src/routes/documentos.tsx` (objeto `CATEGORIAS_TREE`) deve ser reestruturada exatamente conforme as definições abaixo:

- [x] **EMPRESARIAL**
  - Contrato Social
  - Alterações Contratuais
  - CNPJ
  - Inscrição Estadual
  - Inscrição Municipal
  - Certificados Digitais
- [x] **REGULATÓRIO**
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
- [x] **SEGURANÇA E SST** (Nova categoria principal - mover itens que estavam em trabalhista)
  - PGR
  - PCMSO
  - LTCAT
  - ASO
- [x] **PRODUTOS CONTROLADOS** (Nova categoria principal)
  - Polícia Civil (mover de regulatório)
  - Polícia Federal (mover de regulatório)
  - Exército (mover de regulatório)
  - MAPA Produtos Controlados (criar/mover para esta categoria)
- [x] **QUALIDADE**
  - POP
  - IT
  - Manual da Qualidade
  - Registros CQ
  - FISPQ
  - Boletins Técnicos
  - (Remover "Treinamentos")
- [x] **RH / ADMINISTRATIVO** (Fusão de Administrativo e Trabalhista)
  - Contratos
  - Procurações
  - Documentos Funcionários
  - Prestadores (Adicionar este novo item)
- [x] **FISCAL / CONTÁBIL**
  - Certidões
  - Débitos
  - Balancetes
  - SPED
  - Simples Nacional

---

### 2. Ajustes nos Campos e Formulários (Interface)

- [ ] **Exposição da Criticidade:** Garantir que o campo de criticidade (Baixa, Média, Alta, Crítica) esteja bem visível no formulário de cadastro, no dashboard e na lista principal de documentos, destacando licenças vitais que não podem vencer (como ANVISA, CETESB e Polícia Federal).
- [ ] **Responsável pela Renovação:** Garantir a existência do campo para selecionar o responsável ou setor da renovação (opções recomendadas: contador, consultoria ambiental, químico, RH, etc.) no formulário e na listagem.
- [ ] **Configuração do MAPA de Produtos Controlados:**
  - Garantir que ao selecionar "MAPA Produtos Controlados" como subcategoria, o formulário ofereça o campo de "Órgão Vinculado" (Polícia Civil, Polícia Federal, Exército, CADRI, etc.) para evitar repetições no nome do documento.
  - Implementar/revisar o controle de prazos de entrega dos mapas conforme o órgão correspondente (ex: mensal, bimensal, trimestral).

---

## 🛠️ Como o Codex deve reportar o progresso
1. Ao iniciar uma tarefa, marque-a com `[/]`.
2. Ao concluir, marque-a com `[x]`.
3. Certifique-se de testar se a build continua funcionando (`npm run build` ou `vite build`) após os ajustes de código.
