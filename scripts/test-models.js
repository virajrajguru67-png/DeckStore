import { fetch } from "undici"; // or native fetch if Node 18+

const API_KEY = process.env.VITE_GROQ_API_KEY || "";

console.log("Starting Groq model check...");

async function check() {
    console.log("Checking llama-3.3-70b-versatile...");
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: "Hi" }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || response.statusText);
        }

        console.log("Response:", data.choices[0].message.content);
        console.log("llama3-70b-8192 IS WORKING");
    } catch (error) {
        console.error("Groq Check FAILED:", error.message);
    }
}

check();
