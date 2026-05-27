import { createServerFn } from "@tanstack/react-start";

export type ExtractedDoc = {
  tipo_documento?: string;
  nome?: string;
  numero_documento?: string;
  orgao_emissor?: string;
  categoria?: string;
  data_emissao?: string;
  data_validade?: string;
  empresa?: string;
  cnpj?: string;
  uf?: string;
  responsavel?: string;
  observacoes?: string;
};

const TIPOS = [
  "Contrato Social", "Alteração Contratual", "Cartão CNPJ",
  "Inscrição Estadual", "Inscrição Municipal", "AFE ANVISA",
  "Licença Sanitária", "CRQ", "CETESB", "FISPQ",
  "Boletim Técnico", "Nota Fiscal", "Certificado", "Procuração",
  "Documento de Funcionário", "AVCB", "Alvará", "Licença Ambiental", "Outros",
];

const SYSTEM = `Você é um especialista em análise de documentos regulatórios e corporativos brasileiros.
Analise o documento (imagem ou PDF) e extraia os metadados com máxima precisão.

REGRAS:
- "tipo_documento" DEVE ser uma das opções: ${TIPOS.join(", ")}.
- "nome" deve ser o título oficial do documento (ex.: "Licença de Operação 2026", "AFE ANVISA").
- "orgao_emissor": ANVISA, CRQ, CETESB, Corpo de Bombeiros, Polícia Civil, Polícia Federal, Exército, Vigilância Sanitária, Prefeitura, Receita Federal, Junta Comercial, Secretaria da Fazenda, ou o nome exato.
- "categoria" sugerida: Licença Ambiental, Sanitária, Fiscal, Trabalhista, Qualidade, RH, ANVISA, Bombeiros, Outros.
- "cnpj" no formato 00.000.000/0000-00 quando presente.
- "uf" sigla com 2 letras maiúsculas (SP, RJ, MG…).
- "empresa" é a razão social vinculada ao documento.
- Datas SEMPRE no formato ISO YYYY-MM-DD.
- Se um campo não estiver no documento, OMITA (não invente).
- "observacoes" deve trazer informações relevantes: escopo, classe, restrições, condicionantes, número de inscrição, etc.`;

export const extractDocumentMetadata = createServerFn({ method: "POST" })
  .inputValidator((d: { base64: string; mimeType: string; fileName?: string }) => {
    if (!d?.base64 || !d?.mimeType) throw new Error("Arquivo inválido");
    return d;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente. Habilite Lovable AI.");

    const dataUrl = `data:${data.mimeType};base64,${data.base64}`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extraia os metadados deste documento${data.fileName ? ` (arquivo: ${data.fileName})` : ""}. Use a função extract_regulatory_document.`,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_regulatory_document",
            description: "Retorna os metadados extraídos do documento.",
            parameters: {
              type: "object",
              properties: {
                tipo_documento: { type: "string", description: "Tipo identificado do documento" },
                nome: { type: "string", description: "Título oficial do documento" },
                numero_documento: { type: "string", description: "Número/protocolo do documento" },
                orgao_emissor: { type: "string", description: "Órgão emissor" },
                categoria: { type: "string", description: "Categoria" },
                data_emissao: { type: "string", description: "Data de emissão YYYY-MM-DD" },
                data_validade: { type: "string", description: "Data de validade YYYY-MM-DD" },
                empresa: { type: "string", description: "Razão social" },
                cnpj: { type: "string", description: "CNPJ formatado" },
                uf: { type: "string", description: "Sigla do estado" },
                responsavel: { type: "string", description: "Responsável técnico/legal" },
                observacoes: { type: "string", description: "Observações, escopo, restrições" },
              },
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_regulatory_document" } },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error(`Falha na análise IA (${res.status}): ${txt.slice(0, 200)}`);
    }

    const json = await res.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return {} as ExtractedDoc;
    try {
      return JSON.parse(call.function.arguments) as ExtractedDoc;
    } catch {
      return {} as ExtractedDoc;
    }
  });
