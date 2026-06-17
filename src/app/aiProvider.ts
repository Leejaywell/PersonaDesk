export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<any>;
}

export interface CallProviderInput {
  endpoint: string;
  model: string;
  apiKey: string;
  messages: ChatCompletionMessage[];
}

export async function callLLMProvider(input: CallProviderInput): Promise<string> {
  const url = input.endpoint.endsWith("/chat/completions")
    ? input.endpoint
    : `${input.endpoint.replace(/\/+$/, "")}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (input.apiKey) {
    headers["Authorization"] = `Bearer ${input.apiKey}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: input.model || "gpt-4o",
      messages: input.messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM provider error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Invalid response format from LLM provider");
  }

  return content;
}

export async function analyzeImageWithVision(
  endpoint: string,
  model: string,
  apiKey: string,
  imageBase64: string,
  prompt: string
): Promise<string> {
  const messages: ChatCompletionMessage[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: prompt,
        },
        {
          type: "image_url",
          image_url: {
            url: imageBase64, // expected as data:image/png;base64,...
          },
        },
      ],
    },
  ];

  return callLLMProvider({ endpoint, model, apiKey, messages });
}
