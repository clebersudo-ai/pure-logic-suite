import { createServerFn } from "@tanstack/react-start";

export type ExtractedDoc = {
  nome?: string;
  numero_documento?: string;
  orgao_emissor?: string;
  categoria?: string;
  data_emissao?: string;
  data_validade?: string;
  empresa?: string;
  responsavel?: string;
  observacoes?: string;
};

const SYSTEM = `Você é um especialista em análise de documentos regulatórios industriais brasileiros (ANVISA, CRQ, CETESB, Corpo de Bombeiros, Polícia Civil, Polícia Federal, Exército, Vigilância Sanitária, Prefeitura, Contrato Social, Inscrição Estadual, etc).
Analise o documento (imagem ou PDF) e extraia os metadados regulatórios com máxima precisão.
- Datas SEMPRE no formato ISO YYYY-MM-DD.
- "nome" deve ser o título oficial do documento (ex: "Licença de Operação", "Autorização de Funcionamento", "AVCB").
- "orgao_emissor" deve ser uma das opções: ANVISA, CRQ, CETESB, Corpo de Bombeiros, Polícia Civil, Polícia Federal, Exército, Vigilância Sanitária, Prefeitura, Receita Federal, Junta Comercial — ou o nome exato do órgão.
- "categoria" sugerida: Licença Ambiental, Licença Sanitária, Autorização Especial, Certificado de Regularidade, Alvará, Contrato Social, Inscrição, AVCB, Outros.
- Se um campo não estiver presente no documento, OMITA o campo (não invente).
- "observacoes" deve trazer informações relevantes (restrições, classe, escopo, condicionantes).`;

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
              text: `Extraia os metadados regulatórios deste documento${data.fileName ? ` (arquivo: ${data.fileName})` : ""}. Use a função extract_regulatory_document.`,
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
            description: "Retorna os metadados extraídos do documento regulatório.",
            parameters: {
              type: "object",
              properties: {
                nome: { type: "string", description: "Título oficial do documento" },
                numero_documento: { type: "string", description: "Número/protocolo do documento" },
                orgao_emissor: { type: "string", description: "Órgão emissor" },
                categoria: { type: "string", description: "Categoria do documento" },
                data_emissao: { type: "string", description: "Data de emissão YYYY-MM-DD" },
                data_validade: { type: "string", description: "Data de validade YYYY-MM-DD" },
                empresa: { type: "string", description: "Razão social / empresa vinculada" },
                responsavel: { type: "string", description: "Responsável técnico / legal" },
                observacoes: { type: "string", description: "Observações relevantes, escopo, restrições" },
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
    if (!call?.function?.arguments) {
      return {} as ExtractedDoc;
    }
    try {
      const parsed = JSON.parse(call.function.arguments) as ExtractedDoc;
      return parsed;
    } catch {
      return {} as ExtractedDoc;
    }
  });
