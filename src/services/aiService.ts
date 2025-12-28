let activeModelName: string | null = null;
let activeVersion: string = "v1beta";

// Helper to discover the right model dynamically
async function discoverModel(apiKey: string) {
    if (activeModelName) return;

    // Attempt to list models to see what this key has access to
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (!response.ok) {
            console.warn("List Models failed:", data);
            // Fallback default if list fails (e.g. permission issue)
            activeModelName = "models/gemini-1.5-flash";
            return;
        }

        const models = data.models || [];
        // Prioritize models in this order (Strict handling)
        const priorities = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro",
            "gemini-pro",
            "gemini-1.0-pro"
        ];

        // Find the best match that supports 'generateContent'
        for (const p of priorities) {
            const found = models.find((m: any) =>
                (m.name === `models/${p}` || m.name === p) &&
                m.supportedGenerationMethods?.includes("generateContent")
            );
            if (found) {
                activeModelName = found.name;
                console.log(`[AI Service] Auto-discovered model: ${activeModelName}`);
                return;
            }
        }

        // If no preferred match, take ANY generateContent model (excluding vision-only if possible)
        const fallback = models.find((m: any) =>
            m.supportedGenerationMethods?.includes("generateContent") &&
            !m.name.includes("vision")
        );

        if (fallback) {
            activeModelName = fallback.name;
            console.log(`[AI Service] Fallback model: ${activeModelName}`);
            return;
        }

    } catch (e) {
        console.error("Model Discovery Error:", e);
    }

    // Ultimate fallback
    activeModelName = "models/gemini-1.5-flash";
}

async function callGeminiAPI(prompt: string, apiKey: string) {
    // Ensure we have a model
    if (!activeModelName) await discoverModel(apiKey);

    const url = `https://generativelanguage.googleapis.com/${activeVersion}/${activeModelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();

    if (!response.ok) {
        const msg = data.error?.message || response.statusText;
        console.error(`Gemini API Error with ${activeModelName}:`, msg);

        // Handle Quota (429) or Not Found (404) or Bad Request (400 - sometimes model specific)
        if (response.status === 404 || response.status === 429 || response.status === 400 || msg.includes("quota")) {
            console.warn("Invalid model or quota exceeded. Resetting active model to try discovery again/fallback.");
            // If we were using a discovered model, clear it so next call tries something else or defaults
            if (activeModelName) {
                activeModelName = null;
                // Note: We won't endlessly retry recursively here to avoid hanging the UI, 
                // but clearing it ensures the NEXT user attempt gets a fresh chance.
                throw new Error(`Quota/Model Error (${activeModelName}). Please try sending again in a moment.`);
            }
        }
        throw new Error(`Gemini Error: ${msg}`);
    }

    if (!data.candidates || data.candidates.length === 0) {
        // Safety block or empty
        return "I couldn't generate a response (Safety Filter triggered).";
    }

    return data.candidates[0].content.parts[0].text;
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

        return await callGeminiAPI(fullPrompt, apiKey);
    },

    async generateSummary(apiKey: string, documentTitle: string, documentContent: string): Promise<string> {
        const prompt = `
Summarize the document "${documentTitle}" in 3 bullet points.
--- CONTENT ---
${documentContent}
`;
        return await callGeminiAPI(prompt, apiKey);
    }
};
