export default async function handler(req, res) {

  // CORS — must be set before anything else
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key exists
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY environment variable is not set. Go to Vercel Dashboard → Your Project → Settings → Environment Variables and add it, then redeploy.'
    });
  }

  // Validate request body
  if (!req.body || !req.body.messages) {
    return res.status(400).json({ error: 'Invalid request body — messages array required' });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: req.body.model || 'claude-sonnet-4-20250514',
        max_tokens: req.body.max_tokens || 4000,
        messages: req.body.messages
      })
    });

    // Read response as text first to avoid JSON parse errors on non-JSON responses
    const rawText = await anthropicRes.text();

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      // Anthropic returned non-JSON — return it as an error
      return res.status(502).json({
        error: 'Anthropic API returned unexpected response',
        status: anthropicRes.status,
        raw: rawText.substring(0, 500)
      });
    }

    return res.status(anthropicRes.status).json(data);

  } catch (err) {
    return res.status(500).json({
      error: 'Proxy error: ' + err.message
    });
  }
}
