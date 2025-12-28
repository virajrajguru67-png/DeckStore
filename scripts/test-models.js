import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyBZ4VHbqF-Vx_YD6dbcTzjA5YdQaz0axq0";

console.log("Starting model check...");

const genAI = new GoogleGenerativeAI(API_KEY);

async function check() {
    console.log("Checking gemini-1.5-flash...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hi");
        console.log("Response:", result.response.text());
        console.log("gemini-1.5-flash IS WORKING");
    } catch (error) {
        console.error("gemini-1.5-flash FAILED:", error.message);
    }
}

check();
