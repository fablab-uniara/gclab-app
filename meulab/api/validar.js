export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  
  const { prompt } = req.body;
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chave API não encontrada. Verifique as variáveis de ambiente na Vercel.' });
  }

  try {
    // Usando o gemini-pro, que é o endereço principal e mais estável
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
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