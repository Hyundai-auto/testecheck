// Configuração da API de pagamento com proxy reverso
// O proxy reverso em server.js encaminha para a API Payevo
const BACKEND_API_BASE_URL = '/api/payments'; // Proxy reverso no seu servidor

// Estado da aplicação
let pixTimer = null;
let timeRemaining = 900; // 15 minutos em segundos
let currentTransactionId = null;

// Máscaras de formatação
function formatCPF(value) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .slice(0, 14);
}

function formatPhone(value) {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d\d)(\d)/g, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 15);
}

// Validações
function validateCPF(cpf) {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    
    // Validação básica de CPF
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
    
    return true;
}

function validateEmail(email) {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 10 || cleanPhone.length === 11;
}

function validateFullName(name) {
    return name.trim().split(' ').length >= 2;
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Validação de campo individual
function validateField(input) {
    const field = input.id;
    const value = input.value;
    let isValid = true;
    let errorMessage = '';
    
    switch(field) {
        case 'fullName':
            if (!value.trim()) {
                errorMessage = 'Nome completo é obrigatório';
                isValid = false;
            } else if (!validateFullName(value)) {
                errorMessage = 'Digite seu nome completo';
                isValid = false;
            }
            break;
        case 'email':
            if (!value.trim()) {
                errorMessage = 'E-mail é obrigatório';
                isValid = false;
            } else if (!validateEmail(value)) {
                errorMessage = 'Digite um e-mail válido';
                isValid = false;
            }
            break;
        case 'cpf':
            if (!value.trim()) {
                errorMessage = 'CPF é obrigatório';
                isValid = false;
            } else if (!validateCPF(value)) {
                errorMessage = 'Digite um CPF válido';
                isValid = false;
            }
            break;
        case 'phone':
            if (!value.trim()) {
                errorMessage = 'Telefone é obrigatório';
                isValid = false;
            } else if (!validatePhone(value)) {
                errorMessage = 'Digite um telefone válido';
                isValid = false;
            }
            break;
    }
    
    const errorElement = document.getElementById(field + 'Error');
    if (isValid) {
        input.classList.remove('error');
        errorElement.textContent = '';
    } else {
        input.classList.add('error');
        errorElement.textContent = errorMessage;
    }
    
    return isValid;
}

// Validação do formulário completo
function validateForm() {
    const fullName = document.getElementById('fullName');
    const email = document.getElementById('email');
    const cpf = document.getElementById('cpf');
    const phone = document.getElementById('phone');
    
    const isFullNameValid = validateField(fullName);
    const isEmailValid = validateField(email);
    const isCPFValid = validateField(cpf);
    const isPhoneValid = validateField(phone);
    
    return isFullNameValid && isEmailValid && isCPFValid && isPhoneValid;
}

/**
 * Processar pagamento Pix com Payevo API via proxy reverso
 * 
 * Fluxo:
 * 1. Frontend envia dados para /api/payments/pix
 * 2. Proxy reverso (server.js) encaminha para Payevo API
 * 3. Payevo retorna QR Code e dados do Pix
 * 4. Frontend exibe QR Code e código copia e cola
 */
async function processPixPayment(formData) {
    console.log("🔄 Iniciando processamento de pagamento Pix");
    console.log("Dados do formulário:", formData);

    // Preparar payload conforme esperado pela API Payevo
    const pixData = {
        paymentMethod: 'PIX',
        amount: Math.round(43.67 * 100), // Valor em centavos (4367 = R$ 43,67)
        customer: {
            name: formData.fullName,
            email: formData.email,
            document: formData.cpf.replace(/\D/g, ''), // Remover formatação
            phone: formData.phone.replace(/\D/g, '') // Remover formatação
        },
        items: [{
            title: 'Checkout',
            quantity: 1,
            price: Math.round(43.67 * 100), // Preço em centavos
            description: 'Pagamento'
        }],
        ip: '127.0.0.1'
    };

    // Log completo no console para depuração
    console.log("📦 Payload enviado para proxy reverso:", JSON.stringify(pixData, null, 2));

    try {
        // Enviar para proxy reverso (server.js)
        // O proxy reverso encaminha para: https://apiv2.payevo.com.br/functions/v1/transactions
        const response = await fetch(`${BACKEND_API_BASE_URL}/pix`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pixData)
        });

        const result = await response.json();
        console.log("📥 Resposta do proxy reverso:", result);

        if (response.ok && result.pix && result.pix.qrcode) {
            // Sucesso: retornar os dados do Pix
            currentTransactionId = result.transactionId;
            console.log("✅ Transação criada com sucesso. ID:", currentTransactionId);
            return result;
        } else {
            console.error('⚠️ Resposta inesperada:', result);
            throw new Error(result.error || result.message || 'Erro ao gerar PIX');
        }
    } catch (error) {
        console.error('❌ Erro ao processar pagamento Pix:', error);
        throw new Error('Erro ao processar pagamento. Tente novamente.');
    }
}

/**
 * Buscar status da transação
 */
async function checkTransactionStatus() {
    if (!currentTransactionId) {
        console.warn('Nenhuma transação ativa');
        return null;
    }

    try {
        console.log(`🔍 Verificando status da transação: ${currentTransactionId}`);

        const response = await fetch(`${BACKEND_API_BASE_URL}/transaction/${currentTransactionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();
        console.log("Status da transação:", result.status);
        return result;
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        return null;
    }
}

// Exibir detalhes do pagamento Pix
function showPixPaymentDetails(paymentResult) {
    console.log("📊 Exibindo detalhes do pagamento Pix");
    
    const pixCodeText = document.getElementById('pixCode');
    const pixQrCodeContainer = document.getElementById('qrcodeContainer');
    
    // Verifica se os dados do PIX foram recebidos corretamente
    if (paymentResult.pix && paymentResult.pix.qrcode) {
        const pixCode = paymentResult.pix.qrcode;
        
        // 1. Exibe o código "Copia e Cola"
        pixCodeText.value = pixCode;
        console.log("✅ Código Pix copia e cola exibido");
        
        // 2. Gera o QR Code visual
        generateQRCode(pixCode);
        console.log("✅ QR Code gerado");
        
        // 3. Exibir informações adicionais se disponíveis
        if (paymentResult.amount) {
            const amountElement = document.querySelector('.pix-amount');
            if (amountElement) {
                amountElement.textContent = `R$ ${(paymentResult.amount / 100).toFixed(2).replace('.', ',')}`;
            }
        }
    } else {
        // Tratamento de erro caso os dados do PIX não sejam encontrados
        pixQrCodeContainer.innerHTML = "Não foi possível obter os dados do PIX.";
        pixCodeText.value = "Tente novamente.";
        console.error("Estrutura de dados PIX inesperada:", paymentResult);
    }
    
    // Inicia o contador de tempo para a validade do PIX
    startPixTimer();
}

// Gerar QR Code usando biblioteca qrcode.react
function generateQRCode(pixCode) {
    const container = document.getElementById('qrcodeContainer');
    container.innerHTML = ''; // Limpar QR Code anterior
    
    // Verificar se a biblioteca QRCode está disponível
    if (typeof QRCode === 'undefined') {
        console.error('Biblioteca QRCode não carregada');
        container.innerHTML = '<p style="color: red;">Erro ao carregar biblioteca de QR Code</p>';
        return;
    }
    
    QRCode.toCanvas(pixCode, {
        width: 256,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, function (error, canvas) {
        if (error) {
            console.error('Erro ao gerar QR Code:', error);
            container.innerHTML = '<p style="color: red;">Erro ao gerar QR Code</p>';
        } else {
            container.appendChild(canvas);
            console.log("✅ QR Code renderizado com sucesso");
        }
    });
}

// Iniciar timer do Pix
function startPixTimer() {
    timeRemaining = 900; // Reset para 15 minutos
    const timerElement = document.getElementById('pixTimer');
    
    if (pixTimer) {
        clearInterval(pixTimer);
    }
    
    pixTimer = setInterval(() => {
        timeRemaining--;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeRemaining <= 0) {
            clearInterval(pixTimer);
            showToast('Código Pix expirado. Gere um novo código.', 'error');
        }
    }, 1000);
}

// Copiar código Pix
function copyPixCode() {
    const pixCodeInput = document.getElementById('pixCode');
    pixCodeInput.select();
    pixCodeInput.setSelectionRange(0, 99999); // Para mobile
    
    navigator.clipboard.writeText(pixCodeInput.value).then(() => {
        showToast('Código Pix copiado!', 'success');
    }).catch(() => {
        // Fallback para navegadores antigos
        document.execCommand('copy');
        showToast('Código Pix copiado!', 'success');
    });
}

// Voltar ao formulário
function backToForm() {
    if (pixTimer) {
        clearInterval(pixTimer);
    }
    document.getElementById('pixScreen').style.display = 'none';
    document.getElementById('formScreen').style.display = 'flex';
}

// Submissão do formulário
async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        showToast('Por favor, corrija os erros no formulário', 'error');
        return;
    }
    
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        cpf: document.getElementById('cpf').value,
        phone: document.getElementById('phone').value
    };
    
    // Mostrar loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    loadingOverlay.style.display = 'flex';
    
    try {
        console.log("⏳ Processando pagamento...");
        const result = await processPixPayment(formData);
        
        if (result && result.pix && result.pix.qrcode) {
            // Exibir detalhes do Pix
            showPixPaymentDetails(result);
            
            // Trocar telas
            document.getElementById('formScreen').style.display = 'none';
            document.getElementById('pixScreen').style.display = 'flex';
            
            showToast('QR Code gerado com sucesso!', 'success');
            console.log("✅ Checkout concluído com sucesso");
        } else {
            throw new Error('Dados do Pix não retornados pela API');
        }
    } catch (error) {
        console.error('Erro ao gerar Pix:', error);
        showToast(error.message || 'Erro ao processar pagamento. Tente novamente.', 'error');
    } finally {
        loadingOverlay.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Inicializando checkout");
    
    // Configurar máscaras
    const cpfInput = document.getElementById('cpf');
    const phoneInput = document.getElementById('phone');
    
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            e.target.value = formatCPF(e.target.value);
        });
    }
    
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            e.target.value = formatPhone(e.target.value);
        });
    }
    
    // Validação em tempo real
    const inputs = document.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                validateField(input);
            }
        });
    });
    
    // Submissão do formulário
    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    console.log("✅ Checkout inicializado com sucesso");
});
