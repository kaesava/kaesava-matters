import { z } from "zod";

export const ReceiptExtractionResultSchema = z
  .object({
    supplierName: z.string().min(1),
    supplierAbn: z.string().nullable(),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    subtotalExTax: z.number().nonnegative(),
    taxAmount: z.number().nonnegative(),
    totalIncTax: z.number().nonnegative(),
  })
  .strict();

export type ReceiptExtractionResult = z.infer<typeof ReceiptExtractionResultSchema>;

export const ExtractReceiptInput = z
  .object({
    imageBase64: z.string().min(1),
    mimeType: z.string().min(1).default("image/jpeg"),
  })
  .strict();

export interface AiGatewayEnv {
  CF_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_ID?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_AI_GATEWAY_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  AI?: { run: (model: string, input: unknown) => Promise<unknown> };
  fetcher?: typeof fetch;
}

export async function extractReceiptViaAiVisionQuery(
  env: AiGatewayEnv,
  input: z.infer<typeof ExtractReceiptInput>
): Promise<ReceiptExtractionResult> {
  const prompt =
    "Extract supplier receipt fields as strict JSON with keys: supplierName, supplierAbn, issueDate (YYYY-MM-DD), subtotalExTax, taxAmount, totalIncTax.";

  const accountId = env.CF_ACCOUNT_ID ?? env.CLOUDFLARE_ACCOUNT_ID;
  const gatewayId = env.CF_AI_GATEWAY_ID ?? env.CLOUDFLARE_AI_GATEWAY_ID;

  let rawText = "";
  if (accountId && gatewayId && env.CLOUDFLARE_API_TOKEN) {
    const fn = env.fetcher ?? fetch;
    const url = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/workers-ai/@cf/meta/llama-3.2-11b-vision-instruct`;
    const res = await fn(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
        "cf-aig-skip-cache": "true",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`AI Gateway request failed (${res.status})`);
    }
    const json = (await res.json()) as { result?: { response?: string }; response?: string };
    rawText = json.result?.response ?? json.response ?? "";
  } else if (env.AI) {
    const out = (await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", { prompt, image: input.imageBase64 })) as {
      response?: string;
    };
    rawText = out.response ?? "";
  } else {
    throw new Error("AI Gateway credentials are not configured.");
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Receipt extraction did not return valid JSON.");
  }
  return ReceiptExtractionResultSchema.parse(JSON.parse(jsonMatch[0]));
}
