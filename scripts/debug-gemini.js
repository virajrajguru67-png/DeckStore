const https = require('https');
const fs = require('fs');
const path = require('path');

// Try to read .env to get the key
let apiKey = "AIzaSyCSkH8IHlA6o5rcW81v7ZUZcrCVrwCoHV4"; // Default to the one user gave last
try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/VITE_GEMINI_API_KEY=(.+)/);
        if (match) {
            apiKey = match[1].trim();
        }
    }
} catch (e) {
    console.log("Could not read .env, using default key");
}

console.log(`Using API Key: ${apiKey.substring(0, 10)}...`);

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models?key=${apiKey}`,
    method: 'GET'
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (d) => {
        data += d;
    });

    res.on('end', () => {
        console.log(`Status Check: ${res.statusCode}`);
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API ERROR DETAILS:");
                console.error(JSON.stringify(json.error, null, 2));
            } else if (json.models) {
                console.log("SUCCESS! Available Models:");
                json.models.forEach(m => {
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                        console.log(` - ${m.name}`);
                    }
                });
            } else {
                console.log("Unexpected JSON:", data.substring(0, 200));
            }
        } catch (e) {
            console.error("Failed to parse response:", e);
            console.log("Raw Response:", data);
        }
    });
});

req.on('error', (e) => {
    console.error("Network Request Error:", e);
});

req.end();
