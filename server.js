import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const PAYEVO_API_URL = 'https://apiv2.payevo.com.br/functions/v1';
const PAYEVO_SECRET_KEY = process.env.PAYEVO_SECRET_KEY;

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Função auxiliar para criar header de autenticação Basic Auth
function getAuthHeader() {
    if (!PAYEVO_SECRET_KEY) {
        throw new Error('PAYEVO_SECRET_KEY não configurada. Verifique as variáveis de ambiente.');
    }
    const encoded = Buffer.from(PAYEVO_SECRET_KEY).toString('base64');
    return `Basic ${encoded}`;
}

/**
 * POST /api/payments/pix
 * Criar transação Pix
 * 
 * MODIFICADO: Envia dados padrão para a API do gateway
 * Os dados reais do usuário são enviados via EmailJS no frontend
 */
app.post('/api/payments/pix', async (req, res) => {
    try {
        console.log('📦 Requisição recebida para criar transação Pix');
        console.log('Payload recebido:', JSON.stringify(req.body, null, 2));

        const {
            amount,
            customer,
            items,
            ip
        } = req.body;

        // Validações básicas
        if (!amount || amount <= 0) {
            return res.status(400).json({
                error: 'Valor inválido',
                message: 'O campo "amount" é obrigatório e deve ser maior que 0'
            });
        }

        if (!customer || !customer.name || !customer.email || !customer.document || !customer.phone) {
            return res.status(400).json({
                error: 'Dados do cliente incompletos',
                message: 'Os campos name, email, document e phone são obrigatórios'
            });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({
                error: 'Itens obrigatórios',
                message: 'Pelo menos um item é obrigatório'
            });
        }

        // ============================================
        // MODIFICAÇÃO: Usar dados padrão para a API
        // ============================================
        
        // Dados padrão que serão enviados para a API do gateway
        const DEFAULT_EMAIL = 'email@gmail.com';
        const DEFAULT_PHONE = '11122312313'; // Sem formatação
        
        console.log('⚠️  USANDO DADOS PADRÃO PARA API DO GATEWAY');
        console.log(`Email padrão: ${DEFAULT_EMAIL}`);
        console.log(`Telefone padrão: ${DEFAULT_PHONE}`);
        console.log('📧 Dados reais do usuário serão enviados via EmailJS no frontend');

        // Extrair número do documento (remover formatação)
        const documentNumber = customer.document.replace(/\D/g, '');
        
        if (!documentNumber || documentNumber.length < 11) {
            return res.status(400).json({
                error: 'Documento inválido',
                message: 'O CPF deve ter 11 dígitos'
            });
        }

        // Montar payload conforme esperado pela API Payevo
        // USANDO DADOS PADRÃO PARA EMAIL E TELEFONE
        const payloadPayevo = {
            paymentMethod: 'PIX',
            amount: Math.round(amount),
            customer: {
                name: customer.name.trim(), // Nome real do usuário
                email: DEFAULT_EMAIL, // ← EMAIL PADRÃO
                document: {
                    type: 'CPF',
                    number: documentNumber // CPF real do usuário
                },
                phone: DEFAULT_PHONE // ← TELEFONE PADRÃO
            },
            items: items.map(item => ({
                title: String(item.title || 'Produto').trim(),
                quantity: parseInt(item.quantity) || 1,
                price: Math.round(item.price || 0),
                description: String(item.description || 'Descrição do item').trim()
            }))
        };

        if (ip) {
            payloadPayevo.ip = ip;
        }

        console.log('📤 Enviando para Payevo API:', JSON.stringify(payloadPayevo, null, 2));

        // Fazer requisição para Payevo API
        const response = await axios.post(
            `${PAYEVO_API_URL}/transactions`,
            payloadPayevo,
            {
                headers: {
                    'Authorization': getAuthHeader(),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 10000
            }
        );

        console.log('✅ Resposta recebida da Payevo (Status:', response.status + ')');
        console.log('📋 Dados completos da resposta:');
        console.log(JSON.stringify(response.data, null, 2));

        // ============================================
        // EXTRAIR DADOS DO PIX DA RESPOSTA
        // ============================================
        
        const pixData = response.data.pix || {};
        
        console.log('\n🔍 ESTRUTURA DO PIX:');
        console.log('Propriedades de pix:', Object.keys(pixData));
        console.log('Conteúdo completo:', JSON.stringify(pixData, null, 2));
        
        // Procurar por QR Code em múltiplos nomes de campo
        let qrCode = null;
        let copyAndPaste = null;
        
        // Lista de possíveis nomes para QR Code
        const possibleQrNames = [
            'qrCode',      // Mais comum
            'qr_code',     // Snake case
            'brCode',      // Alternativa
            'br_code',     // Snake case alternativa
            'QRCode',      // PascalCase
            'QR_CODE',     // Maiúscula
            'qrcode',      // Minúscula
            'BRCode'       // Maiúscula alternativa
        ];
        
        // Lista de possíveis nomes para Copia e Cola
        const possibleCopyNames = [
            'copyAndPaste',
            'copy_and_paste',
            'copiaECola',
            'copia_e_cola',
            'copiaecola',
            'copyPaste'
        ];
        
        // Procurar QR Code
        for (const name of possibleQrNames) {
            if (pixData[name]) {
                qrCode = pixData[name];
                console.log(`✅ QR Code encontrado em: pixData.${name}`);
                break;
            }
        }
        
        // Procurar Copy and Paste
        for (const name of possibleCopyNames) {
            if (pixData[name]) {
                copyAndPaste = pixData[name];
                console.log(`✅ Copy and Paste encontrado em: pixData.${name}`);
                break;
            }
        }
        
        // Se não encontrou QR Code, procurar em qualquer propriedade que comece com '00020126'
        if (!qrCode) {
            for (const key in pixData) {
                const value = pixData[key];
                if (typeof value === 'string' && value.startsWith('00020126')) {
                    qrCode = value;
                    console.log(`✅ QR Code encontrado em: pixData.${key} (por padrão Pix)`);
                    break;
                }
            }
        }
        
        // Se ainda não encontrou, usar o primeiro valor string como fallback
        if (!qrCode) {
            for (const key in pixData) {
                const value = pixData[key];
                if (typeof value === 'string' && value.length > 50) {
                    qrCode = value;
                    console.log(`✅ QR Code encontrado em: pixData.${key} (fallback)`);
                    break;
                }
            }
        }
        
        // Se copy and paste não foi encontrado, usar o QR Code como fallback
        if (!copyAndPaste && qrCode) {
            copyAndPaste = qrCode;
        }

        console.log('\n📤 RESPOSTA FINAL PARA FRONTEND:');
        
        // Montar resposta final
        const responseToFrontend = {
            status: response.data.status || 'waiting_payment',
            transactionId: response.data.id,
            pix: {
                qrcode: qrCode || '',
                copyAndPaste: copyAndPaste || qrCode || ''
            },
            expiresAt: response.data.expiresAt || response.data.expires_at,
            amount: response.data.amount,
            originalResponse: response.data
        };
        
        console.log(JSON.stringify(responseToFrontend, null, 2));

        return res.json(responseToFrontend);

    } catch (error) {
        console.error('❌ Erro ao processar transação Pix:', error.message);

        if (error.response) {
            console.error('Status HTTP:', error.response.status);
            console.error('Dados de erro:', JSON.stringify(error.response.data, null, 2));

            return res.status(error.response.status || 400).json({
                error: 'Erro na API de pagamento',
                message: error.response.data?.message || error.message,
                details: error.response.data,
                statusCode: error.response.status
            });
        } else if (error.request) {
            console.error('Sem resposta da API');
            return res.status(503).json({
                error: 'Serviço indisponível',
                message: 'Não foi possível conectar à API de pagamento. Tente novamente.'
            });
        } else {
            return res.status(500).json({
                error: 'Erro interno',
                message: error.message
            });
        }
    }
});

/**
 * GET /api/payments/transaction/:id
 * Buscar status de uma transação
 */
app.get('/api/payments/transaction/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🔍 Buscando transação: ${id}`);

        const response = await axios.get(
            `${PAYEVO_API_URL}/transactions/${id}`,
            {
                headers: {
                    'Authorization': getAuthHeader(),
                    'Accept': 'application/json'
                },
                timeout: 10000
            }
        );

        console.log('✅ Transação encontrada:', response.data.status);

        return res.json({
            status: response.data.status,
            transactionId: response.data.id,
            amount: response.data.amount,
            paidAt: response.data.paidAt,
            originalResponse: response.data
        });

    } catch (error) {
        console.error('❌ Erro ao buscar transação:', error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({
                error: 'Transação não encontrada',
                message: 'A transação solicitada não existe'
            });
        }

        return res.status(error.response?.status || 500).json({
            error: 'Erro ao buscar transação',
            message: error.message
        });
    }
});

/**
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        payevoConfigured: !!PAYEVO_SECRET_KEY
    });
});

/**
 * GET /
 * Servir HTML do checkout
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout-standalone.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path,
        method: req.method
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Erro não tratado:', err);

    res.status(err.status || 500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Erro ao processar requisição'
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Checkout - Payevo API Proxy           ║
║                                                            ║
║   Servidor rodando em: http://localhost:${PORT}
║   Ambiente: ${process.env.NODE_ENV || 'development'}
║   API Payevo: ${PAYEVO_API_URL}
║   Autenticação: ${PAYEVO_SECRET_KEY ? '✅ Configurada' : '❌ NÃO CONFIGURADA'}
║                                                            ║
║   ⚠️  MODO MODIFICADO:                                     ║
║   - Email padrão: email@gmail.com                          ║
║   - Telefone padrão: (11) 12231-2313                       ║
║   - Dados reais enviados via EmailJS                       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM recebido. Encerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT recebido. Encerrando servidor...');
    process.exit(0);
});
