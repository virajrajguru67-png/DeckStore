const API_KEY = "AIzaSyCSkH8IHlA6o5rcW81v7ZUZcrCVrwCoHV4";
const url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + API_KEY;

console.log("Checking models using fetch...");

async function run() {
    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log("Status:", response.status);

        if (data.models) {
            console.log("MODELS FOUND:");
            data.models.forEach(m => console.log(m.name));
        } else {
            console.log("RESPONSE:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.log("FETCH ERROR:", e.message);
    }
}

run();
