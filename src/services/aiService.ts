

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
You are DeckStore Intelligence, a helpful and precise assistant for the document "${documentTitle}".

--- DOCUMENT CONTEXT ---
${documentContent}
------------------------

--- CONVERSATION HISTORY ---
${conversationLog}
User: ${newMessage}
----------------------------

Answer the user's question based on the document. Be brief, professional, and helpful.
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
