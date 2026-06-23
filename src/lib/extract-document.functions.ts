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

const NVIDIA_MODEL = "meta/llama-3.2-90b-vision-instruct";
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const GEMINI_MODEL = "google/gemini-2.5-flash";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const NVIDIA_IMAGE_TYPES = new Set([
  "image/png", "image/jpeg", "image/jpg", "image/webp",
]);

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

async function extractWithNvidia(
  apiKey: string,
  data: { base64: string; mimeType: string; fileName?: string },
): Promise<ExtractedDoc> {
  const sizeBytes = Math.floor((data.base64.length * 3) / 4);
  if (sizeBytes > 180_000) {
    throw new Error(
      `Imagem muito grande (${Math.round(sizeBytes / 1024)}KB). Limite NVIDIA: 180KB. Reduza a resolução antes de enviar.`,
    );
  }

  const userPrompt = `Extraia os metadados deste documento${data.fileName ? ` (arquivo: ${data.fileName})` : ""}. Responda apenas com JSON válido, omitindo campos não encontrados. <img src="data:${data.mimeType};base64,${data.base64}" />`;

  const res = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      max_tokens: 1024,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("NVIDIA API error", res.status, txt.slice(0, 500));
    if (res.status === 401) throw new Error("Chave NVIDIA_API_KEY inválida.");
    if (res.status === 429) throw new Error("Limite NVIDIA atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos NVIDIA esgotados.");
    throw new Error(`Falha NVIDIA (${res.status}): ${txt.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  return typeof content === "string" ? parseExtractedJson(content) : {};
}

async function extractWithGemini(
  apiKey: string,
  data: { base64: string; mimeType: string; fileName?: string },
): Promise<ExtractedDoc> {
  const res = await fetch(GEMINI_URL(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Extraia os metadados deste documento${data.fileName ? ` (arquivo: ${data.fileName})` : ""}. Responda APENAS com JSON válido, omitindo campos não encontrados.`,
            },
            { inlineData: { mimeType: data.mimeType, data: data.base64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("Gemini API error", res.status, txt.slice(0, 500));
    if (res.status === 401 || res.status === 403) throw new Error("Chave GEMINI_API_KEY inválida.");
    if (res.status === 429) throw new Error("Limite Gemini atingido. Tente novamente em instantes.");
    throw new Error(`Falha Gemini (${res.status}): ${txt.slice(0, 200)}`);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p: { text?: string }) => p?.text ?? "").join("")
    : "";
  return text ? parseExtractedJson(text) : {};
}

export const extractDocumentMetadata = createServerFn({ method: "POST" })
  .inputValidator((d: { base64: string; mimeType: string; fileName?: string }) => {
    if (!d?.base64 || !d?.mimeType) throw new Error("Arquivo inválido");
    return d;
  })
  .handler(async ({ data }) => {
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const mime = data.mimeType.toLowerCase();
    const isNvidiaImage = NVIDIA_IMAGE_TYPES.has(mime);

    if (isNvidiaImage) {
      if (nvidiaKey) {
        try {
          return await extractWithNvidia(nvidiaKey, data);
        } catch (err) {
          if (!geminiKey) throw err;
          console.warn("NVIDIA falhou, tentando Gemini como fallback:", (err as Error).message);
          return await extractWithGemini(geminiKey, data);
        }
      }
      if (geminiKey) return await extractWithGemini(geminiKey, data);
      throw new Error("Configure NVIDIA_API_KEY (ou GEMINI_API_KEY) para analisar imagens.");
    }

    // PDFs e demais documentos → Gemini
    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY ausente. Necessária para analisar PDFs e documentos não-imagem.");
    }
    return await extractWithGemini(geminiKey, data);
  });
