export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  
  const { prompt } = req.body;
  
  // Puxa a chave de onde ela estiver
  const rawApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!rawApiKey) {
    return res.status(500).json({ error: 'Chave API não encontrada na Vercel.' });
  }

  // A MÁGICA AQUI: O .trim() remove os espaços invisíveis e quebras de linha!
  const apiKey = rawApiKey.trim();

  try {
    // Voltamos para o robô oficial e mais rápido
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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