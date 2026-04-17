

async function callGroqAPI(prompt: string, apiKey: string): Promise<string> {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        const msg = data.error?.message || response.statusText;
        console.error(`Groq API Error:`, msg);
        throw new Error(`Groq Error: ${msg}`);
    }
    if (!data.choices || data.choices.length === 0) {
        return "I couldn't generate a response (no choices returned).";
    }
    return data.choices[0].message.content;
}

export const aiService = {
    // We assume it's configured if the component passes the key
    isConfigured: () => true,

    async generateChatResponse(apiKey: string, documentTitle: string, documentContent: string, history: { role: string; content: string }[], newMessage: string) {
        const conversationLog = history.map(msg =>
            `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n');

        const fullPrompt = `
You are DeckStore Intelligence, a highly structured and precise document analyst for "${documentTitle}".

--- FORMATTING RULES ---
1. If the user asks for questions and answers, strictly follow this pattern:
   Q1) [Question Text]
   Ans: [Answer Text]
   
   Q2) ...
   Ans: ...
2. Use bullet points (•) for lists.
3. Be professional, concise, and structured.
------------------------

--- DOCUMENT CONTEXT ---
${documentContent}
------------------------

--- CONVERSATION HISTORY ---
${conversationLog}
User: ${newMessage}
----------------------------

Answer based on the document provided.
Assistant:
`;

        return await callGroqAPI(fullPrompt, apiKey);
    },

    async generateSummary(apiKey: string, documentTitle: string, documentContent: string): Promise<string> {
        const prompt = `
Summarize the document "${documentTitle}" in 3 bullet points.
--- CONTENT ---
${documentContent}
`;
        return await callGroqAPI(prompt, apiKey);
    }
};
