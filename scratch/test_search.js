const axios = require('axios');

async function testSearch() {
  const token = 'YOUR_TOKEN_HERE'; // I'll need to get a token or bypass it
  try {
    const res = await axios.get('http://localhost:5000/api/search/folders?q=hel', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Results:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

// testSearch();
