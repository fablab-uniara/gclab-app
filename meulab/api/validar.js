export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  
  const { prompt } = req.body;
  
  const rawApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!rawApiKey) {
    return res.status(500).json({ error: 'Chave API não encontrada na Vercel.' });
  }

  const apiKey = rawApiKey.trim();

  try {
    // A GRANDE CORREÇÃO: Usando a versão atualizada do modelo em 2026 (2.5-flash)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: `Erro do Google: ${data.error.message}` });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}