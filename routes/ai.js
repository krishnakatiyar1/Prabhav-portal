const express = require('express');
const router = express.Router();

// Fallback classifier if AI API key is missing, invalid, or service is unavailable
function getFallbackClassification(item) {
  const query = (item || '').toLowerCase().trim();

  // Dry Recyclable Waste
  if (query.match(/plastic|bottle|can|tin|paper|cardboard|carton|glass|metal|box|newspaper|wrapper|polythene|cup/)) {
    return {
      category: 'Dry Waste',
      binColor: 'Blue',
      disposalTip: 'Rinse and dry the item. Flatten before putting it in the Blue bin to save space.'
    };
  }

  // Wet Organic Waste
  if (query.match(/food|fruit|vegetable|peel|meat|leftover|leaf|leaves|organic|tea|coffee|banana|apple|bread|egg/)) {
    return {
      category: 'Wet Waste',
      binColor: 'Green',
      disposalTip: 'Place in the Green bin for municipal composting. Keep free from plastic bags.'
    };
  }

  // Hazardous & E-Waste
  if (query.match(/battery|chemical|paint|medicine|pill|e-waste|electronic|phone|bulb|tube|needle|syringe|blade/)) {
    return {
      category: 'Hazardous Waste',
      binColor: 'Red',
      disposalTip: 'Store separately in a secure container and hand over to municipal hazardous or e-waste collection.'
    };
  }

  // General Municipal Waste
  return {
    category: 'General Waste',
    binColor: 'Blue',
    disposalTip: 'Clean the item and sort into dry recyclables or organic wet waste as per local municipal rules.'
  };
}

// POST /api/ai/classify
router.post('/classify', async (req, res) => {
  try {
    const { item } = req.body;

    if (!item || typeof item !== 'string' || !item.trim()) {
      return res.status(400).json({ error: 'Item name is required for classification.' });
    }

    const cleanItem = item.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    // Check if key is missing or dummy placeholder
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || apiKey.startsWith('dummy') || apiKey.trim() === '') {
      return res.status(200).json(getFallbackClassification(cleanItem));
    }

    // Call Google Gemini API
    try {
      const prompt = `Classify this waste item: "${cleanItem}".
Return a JSON object with:
- "category": waste category (e.g. Dry Waste, Wet Waste, Hazardous Waste)
- "binColor": recommended bin color (Green, Blue, Red, or Yellow)
- "disposalTip": brief 1-2 sentence practical disposal advice.

Respond ONLY with valid JSON in this format:
{"category":"...","binColor":"...","disposalTip":"..."}`;

      // Helper to call Gemini model
      async function callGemini(modelName) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          }),
          signal: AbortSignal.timeout(8000)
        });
      }

      // Use default model gemini-3.8-flash, auto-fallback to gemini-3.5-flash if 503 or unavailable
      let response = await callGemini('gemini-3.8-flash');
      if (!response.ok) {
        response = await callGemini('gemini-3.5-flash');
      }

      if (!response.ok) {
        console.warn(`Gemini API returned status ${response.status}. Using fallback response.`);
        return res.status(200).json(getFallbackClassification(cleanItem));
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        return res.status(200).json(getFallbackClassification(cleanItem));
      }

      // Parse JSON from Gemini response
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      }

      const parsed = JSON.parse(cleaned);

      return res.status(200).json({
        category: parsed.category || 'Dry Waste',
        binColor: parsed.binColor || 'Blue',
        disposalTip: parsed.disposalTip || 'Follow local municipal waste segregation guidelines.'
      });
    } catch (apiErr) {
      console.warn('Gemini API call failed or timed out. Serving fallback:', apiErr.message);
      return res.status(200).json(getFallbackClassification(cleanItem));
    }
  } catch (err) {
    console.error('Server error in /api/ai/classify:', err.message);
    return res.status(500).json({ error: 'Internal server error during classification.' });
  }
});

module.exports = router;
