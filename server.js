const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


app.post('/api/payments/pix', async (req, res) => {
  try {
    const response = await fetch('https://api.payevo.com.br/functions/v1/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from('sk_like_TwelXzNigaAN1AeC5OeKex9fPl8ggr1BahAZ7V1p1HrhiIsJ:x').toString('base64')
  },
  body: JSON.stringify(req.body)
});

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Erro no proxy PIX:', err);
    res.status(500).json({ message: 'Erro no servidor de pagamento PIX' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
