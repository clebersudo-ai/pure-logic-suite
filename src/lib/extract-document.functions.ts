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
- "observacoes" deve trazer informações relevantes: escopo, classe, restrições, condicionantes, número de inscrição, etc.
- Responda APENAS com um JSON válido, sem markdown e sem explicações.`;

const NVIDIA_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

function parseExtractedJson(content: string): ExtractedDoc {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
  const candidate = fenced || trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return {};
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as ExtractedDoc;
  } catch {
    return {};
  }
}

export const extractDocumentMetadata = createServerFn({ method: "POST" })
  .inputValidator((d: { base64: string; mimeType: string; fileName?: string }) => {
    if (!d?.base64 || !d?.mimeType) throw new Error("Arquivo inválido");
    return d;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error("NVIDIA_API_KEY ausente. Gere uma chave gratuita em build.nvidia.com e configure no ambiente.");

    const dataUrl = `data:${data.mimeType};base64,${data.base64}`;

    const body = {
      model: NVIDIA_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extraia os metadados deste documento${data.fileName ? ` (arquivo: ${data.fileName})` : ""}.

Formato obrigatório:
{
  "tipo_documento": "uma das opções permitidas",
  "nome": "título oficial",
  "numero_documento": "número/protocolo quando existir",
  "orgao_emissor": "órgão emissor",
  "categoria": "categoria sugerida",
  "data_emissao": "YYYY-MM-DD",
  "data_validade": "YYYY-MM-DD",
  "empresa": "razão social",
  "cnpj": "00.000.000/0000-00",
  "uf": "SP",
  "responsavel": "responsável técnico/legal",
  "observacoes": "escopo, restrições e condicionantes"
}

Omita campos não encontrados.`,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.1,
      top_p: 0.7,
      stream: false,
    };

    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 401) throw new Error("Chave NVIDIA inválida ou ausente. Verifique NVIDIA_API_KEY.");
      if (res.status === 429) throw new Error("Limite gratuito da NVIDIA atingido. Tente novamente em instantes.");
      throw new Error(`Falha na análise IA NVIDIA (${res.status}): ${txt.slice(0, 200)}`);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    return typeof content === "string" ? parseExtractedJson(content) : {};
  });
