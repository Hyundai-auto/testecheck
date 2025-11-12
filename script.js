// Variáveis globais e elementos do DOM
const checkoutForm = document.getElementById('checkoutForm');
const formSection = document.getElementById('formSection');
const pixSection = document.getElementById('pixSection');
const successSection = document.getElementById('successSection');

const nomeInput = document.getElementById('nome');
const emailInput = document.getElementById('email');
const cpfInput = document.getElementById('cpf');
const telefoneInput = document.getElementById('telefone');

const copyBtn = document.getElementById('copyPixKeyBtn');
const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
const backBtn = document.getElementById('backToFormBtn');

let currentStep = 'form';
let formData = {
    nome: '',
    email: '',
    cpf: '',
    telefone: ''
};
let errors = {};

// Variável para simular o valor total do pagamento (em reais)
// **IMPORTANTE**: Ajuste este valor conforme a necessidade real da sua aplicação.
window.totalAmount = 42.50; 

// Funções de formatação
function formatCPF(value) {
    value = value.replace(/\D/g, '');
    if (value.length > 3) value = value.replace(/(\d{3})(\d)/, '$1.$2');
    if (value.length > 7) value = value.replace(/(\d{3})(\d{3})(\d)/, '$1.$2.$3');
    if (value.length > 11) value = value.replace(/(\d{3})(\d{3})(\d{3})(\d)/, '$1.$2.$3-$4');
    return value.substring(0, 14);
}

function formatPhone(value) {
    value = value.replace(/\D/g, '');
    if (value.length > 0) value = '(' + value;
    if (value.length > 3) value = value.replace(/(\d{2})(\d)/, '$1) $2');
    if (value.length > 10) value = value.replace(/(\d{5})(\d)/, '$1-$2');
    return value.substring(0, 15);
}

// Listeners de input para formatação e coleta de dados
nomeInput.addEventListener('input', (e) => { formData.nome = e.target.value; clearError('nome'); });
emailInput.addEventListener('input', (e) => { formData.email = e.target.value; clearError('email'); });
cpfInput.addEventListener('input', (e) => { const formatted = formatCPF(e.target.value); formData.cpf = formatted; cpfInput.value = formatted; clearError('cpf'); });
telefoneInput.addEventListener('input', (e) => { const formatted = formatPhone(e.target.value); formData.telefone = formatted; telefoneInput.value = formatted; clearError('telefone'); });

// Funções de validação e erro
function validateForm() {
    errors.nome = '';
    errors.email = '';
    errors.cpf = '';
    errors.telefone = '';

    if (!formData.nome.trim()) {
        errors.nome = 'Nome completo é obrigatório';
    } else if (formData.nome.trim().split(' ').length < 2) {
        errors.nome = 'Digite seu nome completo';
    }

    if (!formData.email.trim()) {
        errors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'E-mail inválido';
    }

    if (!formData.cpf.trim()) {
        errors.cpf = 'CPF é obrigatório';
    } else {
        const cpfClean = formData.cpf.replace(/\D/g, '');
        if (cpfClean.length !== 11) {
            errors.cpf = 'CPF deve ter 11 dígitos';
        } else if (/^(\d)\1{10}$/.test(cpfClean)) {
            errors.cpf = 'CPF inválido';
        }
    }

    if (!formData.telefone.trim()) {
        errors.telefone = 'Telefone é obrigatório';
    } else {
        const phoneClean = formData.telefone.replace(/\D/g, '');
        if (phoneClean.length < 10) {
            errors.telefone = 'Telefone inválido';
        }
    }

    displayErrors();
    return Object.keys(errors).filter(key => errors[key]).length === 0;
}

function displayErrors() {
    Object.keys(errors).forEach(field => {
        const errorElement = document.getElementById(`${field}Error`);
        const inputElement = document.getElementById(field);
        if (errors[field]) {
            errorElement.textContent = '⚠️ ' + errors[field];
            inputElement.classList.add('error');
        } else {
            errorElement.textContent = '';
            inputElement.classList.remove('error');
        }
    });
}

function clearError(field) {
    errors[field] = '';
    document.getElementById(`${field}Error`).textContent = '';
    document.getElementById(field).classList.remove('error');
}

// Fluxo de navegação
checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateForm()) {
        goToPixStep();
    }
});

function goToPixStep() {
    currentStep = 'pix';
    updateProgress();
    formSection.classList.add('hidden');
    pixSection.classList.remove('hidden');
    document.getElementById('payerName').textContent = formData.nome;
    document.getElementById('payerEmail').textContent = formData.email;
    window.scrollTo(0, 0);
    
    // CHAMA A FUNÇÃO DE PROCESSAMENTO DO PIX AQUI
    processPixPayment();
}

function goToSuccessStep() {
    currentStep = 'success';
    updateProgress();
    pixSection.classList.add('hidden');
    successSection.classList.remove('hidden');
    document.getElementById('successName').textContent = formData.nome;
    document.getElementById('successEmail').textContent = formData.email;
    document.getElementById('successCPF').textContent = formData.cpf;
    document.getElementById('successPhone').textContent = formData.telefone;
    document.getElementById('successEmailAlert').textContent = formData.email;
    document.getElementById('transactionId').textContent = `ID da Transação: #GOV-${Date.now()}`;
    window.scrollTo(0, 0);
}

function goBackToForm() {
    currentStep = 'form';
    updateProgress();
    pixSection.classList.add('hidden');
    formSection.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function updateProgress() {
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const line1 = document.getElementById('line1');
    const line2 = document.getElementById('line2');

    step1.classList.toggle('active', currentStep === 'form');
    step1.classList.toggle('inactive', currentStep !== 'form');
    step2.classList.toggle('active', ['pix', 'success'].includes(currentStep));
    step2.classList.toggle('inactive', !['pix', 'success'].includes(currentStep));
    step3.classList.toggle('active', currentStep === 'success');
    step3.classList.toggle('inactive', currentStep !== 'success');
    line1.classList.toggle('active', currentStep !== 'form');
    line2.classList.toggle('active', currentStep === 'success');
}

// Listeners de botões
confirmPaymentBtn.addEventListener('click', () => { goToSuccessStep(); });
backBtn.addEventListener('click', () => { goBackToForm(); });
updateProgress();

// ====================================================================================
// LÓGICA DE PAGAMENTO PIX (INSERIDA)
// ====================================================================================

const BACKEND_API_BASE_URL = '/api/payments'; // Endpoint da API de pagamento
let pixTimer = null; // Variável para controlar o temporizador do PIX
const pixQrCodeContainer = document.getElementById('qrCodePlaceholder');
const pixCodeText = document.getElementById('pixKeyInput');
const timerElement = document.getElementById('pixTimeRemaining');
const loadingOverlay = document.getElementById('loadingOverlay');

// 1. Função Principal de Processamento de Pagamento PIX
async function processPixPayment() {
    // 1.1. Coleta e validação dos dados do formulário (já feito em validateForm)
    // 1.2. Montagem do payload de dados para a API de pagamento
    const pixData = {
        paymentMethod: 'PIX',
        // O valor deve ser enviado em centavos (multiplicado por 100)
        amount: Math.round(window.totalAmount * 100), 
        customer: {
            name: formData.nome,
            email: formData.email,
            document: formData.cpf.replace(/\D/g, ''),
            phone: formData.telefone.replace(/\D/g, '')
        },
        // Dados de endereço simplificados para este exemplo (pode ser expandido)
        shipping: {
            address: {
                street: 'Rua Exemplo',
                streetNumber: '100',
                complement: '',
                neighborhood: 'Bairro Exemplo',
                city: 'Cidade Exemplo',
                state: 'SP',
                country: 'BR',
                zipCode: '00000000'
            }
        },
        items: [{
            title: String('Pagamento de Serviço Público'), // ✅ obrigatório
            quantity: 1,
            price: Math.round(window.totalAmount * 100),
            description: String('Pagamento via Portal do Governo') // ✅ obrigatório
        }],
        ip: '127.0.0.1'
    };

    console.log("📦 Payload final enviado:", JSON.stringify(pixData, null, 2));
    loadingOverlay.style.display = 'flex';

    try {
        // Chamada à API de pagamento (simulada ou real)
        const response = await fetch(`${BACKEND_API_BASE_URL}/pix`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pixData)
        });

        const result = await response.json();
        console.log("Resposta da API:", result);

        if (response.ok && (result.status === 'waiting_payment' || result.status === 'pending')) {
            showPixPaymentDetails(result); 
            showSuccessNotification('PIX gerado com sucesso!');
        } else {
            console.error('⚠️ Resposta recebida, mas status inesperado:', result.status);
            throw new Error(result.message || 'Erro ao gerar PIX');
        }
    } catch (error) {
        console.error('Erro PIX:', error);
        alert('Erro ao processar pagamento PIX. Tente novamente.');
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// 2. Função para Exibir Detalhes do PIX (QR Code e Copia e Cola)
function showPixPaymentDetails(paymentResult) {
    // Garante que a seção de detalhes do PIX esteja visível (já está no goToPixStep)
    
    if (paymentResult.pix && paymentResult.pix.qrcode) {
        const pixCode = paymentResult.pix.qrcode;
        
        // 1. Exibe o código "Copia e Cola"
        pixCodeText.value = pixCode;
            
        // 2. Gera o QR Code (requer a biblioteca qrcodejs)
        // Limpa o container antes de gerar um novo QR Code
        pixQrCodeContainer.innerHTML = ''; 
        new QRCode(pixQrCodeContainer, {
            text: pixCode,
            width: 128,
            height: 128,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        // 3. Inicia o contador de tempo para a validade do PIX (15 minutos)
        startPixTimer(900); 
        
    } else {
        pixQrCodeContainer.innerHTML = "Não foi possível obter os dados do PIX.";
        pixCodeText.value = "Tente novamente.";
        console.error("Estrutura de dados PIX inesperada:", paymentResult );
    }
}

// 3. Função para Iniciar o Temporizador do PIX
function startPixTimer(seconds) {
    // Limpa o timer anterior, se houver
    if (pixTimer) {
        clearInterval(pixTimer);
    }
    
    let timeLeft = seconds;
    
    pixTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(pixTimer);
            timerElement.textContent = 'Expirado';
            alert('O código PIX expirou. Por favor, gere um novo código.');
            // Desabilita o botão de confirmação de pagamento
            confirmPaymentBtn.disabled = true;
        }
        
        timeLeft--;
    }, 1000);
}

// 4. Função para Notificação de Sucesso (simples)
function showSuccessNotification(message) {
    const notification = document.getElementById('successNotification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// 5. Atualiza o listener do botão de cópia para usar a nova estrutura
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(pixCodeText.value).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copiado';
        copyBtn.classList.add('copied');
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('copied');
        }, 2000);
    });
});

// ====================================================================================
// FIM DA LÓGICA DE PAGAMENTO PIX
// ====================================================================================
