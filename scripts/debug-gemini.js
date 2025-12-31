const https = require('https');
const fs = require('fs');
const path = require('path');

// Try to read .env to get the key
let apiKey = "";
try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/VITE_GROQ_API_KEY=(.+)/);
        if (match) {
            apiKey = match[1].trim();
        }
    }
} catch (e) {
    console.log("Could not read .env, using default key");
}

console.log(`Using API Key: ${apiKey.substring(0, 10)}...`);

const data = JSON.stringify({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: "Hello" }]
});

const options = {
    hostname: 'api.groq.com',
    port: 443,
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', (d) => {
        responseData += d;
    });

    res.on('end', () => {
        console.log(`Status Check: ${res.statusCode}`);
        try {
            const json = JSON.parse(responseData);
            if (json.error) {
                console.error("API ERROR DETAILS:");
                console.error(JSON.stringify(json.error, null, 2));
            } else if (json.choices) {
                console.log("SUCCESS! Response received:");
                console.log(json.choices[0].message.content);
            } else {
                console.log("Unexpected JSON:", responseData.substring(0, 200));
            }
        } catch (e) {
            console.error("Failed to parse response:", e);
            console.log("Raw Response:", responseData);
        }
    });
});

req.on('error', (e) => {
    console.error("Network Request Error:", e);
});

req.write(data);
req.end();
