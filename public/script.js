let currentStep = 1;
        let selectedShipping = 'standard';
        let selectedPayment = 'credit';
        let addressFilled = false;
        let pixTimer = null;
        
        window.checkoutData = {};
        
        const CREDIT_CARD_FEE_PERCENTAGE = 50;
        
        // CORREÇÃO CORS: Usar proxy reverso em vez de chamar diretamente a API externa
        const BACKEND_API_BASE_URL = '/api/payments'; // Proxy reverso configurado no servidor
        
        let cartData = {
            subtotal: 299.90
        };

        document.addEventListener('DOMContentLoaded', function() {
            parseSubtotalFromURL();
            setupEventListeners();
            updateProgress();
            setupMasks();
            updateCartDisplay();
            
            const creditCardNotice = document.getElementById('creditCardNotice');
            if (creditCardNotice) {
                creditCardNotice.style.display = 'none';
            }
        });

        function parseSubtotalFromURL() {
            const urlParams = new URLSearchParams(window.location.search);
            const subtotalParam = urlParams.get('subtotal');
            
            if (subtotalParam) {
                try {
                    cartData.subtotal = parseFloat(subtotalParam);
                    console.log('Subtotal loaded from URL:', cartData.subtotal);
                } catch (error) {
                    console.error('Error parsing subtotal from URL:', error);
                }
            }
        }

        function updateCartDisplay() {
            updateOrderTotals();
        }

        function updateOrderTotals() {
            const subtotalEl = document.querySelector(".sidebar .total-row span:last-child");
            const mobileSubtotalEl = document.querySelector("#summaryContent .total-row span:nth-child(2)");
            
            if (subtotalEl) {
                subtotalEl.textContent = `R$ ${cartData.subtotal.toFixed(2).replace(".", ",")}`;
            }
            if (mobileSubtotalEl) {
                mobileSubtotalEl.textContent = `R$ ${cartData.subtotal.toFixed(2).replace(".", ",")}`;
            }
            
            const mobileTotalPrice = document.getElementById("mobileTotalPrice");
            if (mobileTotalPrice) {
                mobileTotalPrice.textContent = `R$ ${cartData.subtotal.toFixed(2).replace(".", ",")}`;
            }
            
            updateShippingCost();
        }

        function setupEventListeners() {
            document.getElementById('contactForm').addEventListener('submit', handleContactSubmit);
            document.getElementById('shippingForm').addEventListener('submit', handleShippingSubmit);
            document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);

            document.querySelectorAll('.shipping-option').forEach(option => {
                option.addEventListener('click', selectShipping);
            });

            document.querySelectorAll('.payment-method').forEach(method => {
                method.querySelector('.payment-header').addEventListener('click', selectPayment);
            });

            document.querySelectorAll('.form-input').forEach(input => {
                input.addEventListener('blur', () => validateField(input));
                input.addEventListener('input', () => {
                    if (input.classList.contains('error')) {
                        validateField(input);
                    }
                });
            });

            document.getElementById('zipCode').addEventListener('keyup', handleCEPLookup);
        }

        function toggleOrderSummary() {
            const toggle = document.querySelector('.summary-toggle');
            const content = document.getElementById('summaryContent');
            const icon = document.querySelector('.summary-toggle-icon');
            
            toggle.classList.toggle('expanded');
            content.classList.toggle('expanded');
            
            if (toggle.classList.contains('expanded')) {
                icon.textContent = '▲';
                document.querySelector('.summary-toggle-text').textContent = 'Ocultar resumo do pedido';
            } else {
                icon.textContent = '▼';
                document.querySelector('.summary-toggle-text').textContent = 'Exibir resumo do pedido';
            }
        }

        async function handleCEPLookup() {
            const cepInput = document.getElementById('zipCode');
            const cep = cepInput.value.replace(/\D/g, '');
            
            if (cep.length === 8) {
                showCEPLoading(true);
                
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await response.json();
                    
                    if (!data.erro) {
                        fillAddressFields(data);
                        showAddressFields();
                        showShippingOptions();
                        const errorEl = document.getElementById('zipCodeError');
                        errorEl.classList.remove('show');
                        cepInput.classList.remove('error');
                    } else {
                        showCEPError();
                    }
                } catch (error) {
                    console.error('Erro ao buscar CEP:', error);
                    showCEPError();
                } finally {
                    showCEPLoading(false);
                }
            } else {
                hideAddressFields();
                hideShippingOptions();
                const errorEl = document.getElementById('zipCodeError');
                errorEl.classList.remove('show');
                cepInput.classList.remove('error');
            }
        }

        function showCEPLoading(show) {
            const loading = document.getElementById('cepLoading');
            if (show) {
                loading.classList.add('show');
            } else {
                loading.classList.remove('show');
            }
        }

        function fillAddressFields(data) {
            document.getElementById('address').value = data.logradouro;
            document.getElementById('neighborhood').value = data.bairro;
            document.getElementById('city').value = data.localidade;
            document.getElementById('state').value = data.uf;
            
            document.getElementById('number').focus();
            addressFilled = true;
        }

        function showAddressFields() {
            const addressFields = document.getElementById('addressFields');
            addressFields.classList.add('show');
        }

        function hideAddressFields() {
            const addressFields = document.getElementById('addressFields');
            addressFields.classList.remove('show');
            addressFilled = false;
        }

        function showShippingOptions() {
            const shippingOptions = document.getElementById('shippingOptions');
            shippingOptions.classList.add('show');
        }

        function hideShippingOptions() {
            const shippingOptions = document.getElementById('shippingOptions');
            shippingOptions.classList.remove('show');
        }

        function showCEPError() {
            const zipCodeInput = document.getElementById('zipCode');
            const errorEl = document.getElementById('zipCodeError');
            
            zipCodeInput.classList.add('error');
            errorEl.textContent = 'CEP não encontrado. Verifique e tente novamente.';
            errorEl.classList.add('show');
            hideAddressFields();
            hideShippingOptions();
        }

        function setupMasks() {
            document.getElementById('cpf').addEventListener('input', function(e) {
                e.target.value = applyCPFMask(e.target.value);
            });

            document.getElementById('phone').addEventListener('input', function(e) {
                e.target.value = applyPhoneMask(e.target.value);
            });

            document.getElementById('zipCode').addEventListener('input', function(e) {
                e.target.value = applyZipMask(e.target.value);
            });

            document.getElementById('cardNumber').addEventListener('input', function(e) {
                e.target.value = applyCardMask(e.target.value);
            });

            document.getElementById('cardExpiry').addEventListener('input', function(e) {
                e.target.value = applyExpiryMask(e.target.value);
            });

            document.getElementById('cardCvv').addEventListener('input', function(e) {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }

        function applyCPFMask(value) {
            return value
                .replace(/\D/g, '')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }

        function applyPhoneMask(value) {
            return value
                .replace(/\D/g, '')
                .replace(/^(\d\d)(\d)/g, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2');
        }

        function applyZipMask(value) {
            return value
                .replace(/\D/g, '')
                .replace(/^(\d{5})(\d)/, '$1-$2');
        }

        function applyCardMask(value) {
            return value
                .replace(/\D/g, '')
                .replace(/(\d{4})(\d)/, '$1 $2')
                .replace(/(\d{4})(\d)/, '$1 $2')
                .replace(/(\d{4})(\d)/, '$1 $2');
        }

        function applyExpiryMask(value) {
            return value
                .replace(/\D/g, '')
                .replace(/^(\d{2})(\d)/, '$1/$2');
        }

        function goToStep(step) {
            if (step < currentStep || validateCurrentStep()) {
                currentStep = step;
                updateStepDisplay();
                updateProgress();
                
                if (currentStep === 3) {
                    updateShippingCost();
                }
                
                if (window.innerWidth < 768) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        }

        function updateStepDisplay() {
            document.querySelectorAll('.step-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`step${currentStep}`).classList.add('active');
        }

        function updateProgress() {
            const steps = document.querySelectorAll('.step');
            const progressLine = document.getElementById('progressLine');
            
            steps.forEach((step, index) => {
                const stepNumber = index + 1;
                step.classList.remove('active', 'completed');
                
                if (stepNumber < currentStep) {
                    step.classList.add('completed');
                    step.querySelector('.step-circle').innerHTML = '✓';
                } else if (stepNumber === currentStep) {
                    step.classList.add('active');
                    step.querySelector('.step-circle').innerHTML = stepNumber;
                } else {
                    step.querySelector('.step-circle').innerHTML = stepNumber;
                }
            });

            const progressWidth = ((currentStep - 1) / (steps.length - 1)) * 100;
            progressLine.style.width = `${progressWidth}%`;
        }

        function validateCurrentStep() {
            const currentStepEl = document.getElementById(`step${currentStep}`);
            const inputs = currentStepEl.querySelectorAll('input[required], select[required]');
            let isValid = true;

            inputs.forEach(input => {
                if (!validateField(input)) {
                    isValid = false;
                }
            });

            if (currentStep === 2 && !addressFilled) {
                isValid = false;
                const zipCodeInput = document.getElementById('zipCode');
                if (!zipCodeInput.classList.contains('error')) {
                    zipCodeInput.classList.add('error');
                    document.getElementById('zipCodeError').textContent = 'Digite um CEP válido para continuar';
                    document.getElementById('zipCodeError').classList.add('show');
                }
            }

            return isValid;
        }

        function validateField(field) {
            const value = field.value.trim();
            const fieldName = field.name;
            let isValid = true;
            let errorMessage = '';

            field.classList.remove('error', 'success');
            const errorEl = document.getElementById(fieldName + 'Error');
            if (errorEl) errorEl.classList.remove('show');

            if (field.hasAttribute('required') && !value) {
                isValid = false;
                errorMessage = "Este campo é obrigatório";
            } else if (value) {
                switch (fieldName) {
                    case "email":
                        if (!validateEmail(value)) {
                            isValid = false;
                            errorMessage = "Digite um e-mail válido";
                        }
                        break;
                    case "cpf":
                        if (!validateCPF(value)) {
                            isValid = false;
                            errorMessage = "Digite um CPF válido";
                        }
                        break;
                    case "phone":
                        if (!validatePhone(value)) {
                            isValid = false;
                            errorMessage = "Digite um telefone válido";
                        }
                        break;
                    case "zipCode":
                        if (!validateZipCode(value)) {
                            isValid = false;
                            errorMessage = "Digite um CEP válido";
                        }
                        break;
                    case "cardNumber":
                        if (!validateCardNumber(value)) {
                            isValid = false;
                            errorMessage = "Digite um número de cartão válido";
                        }
                        break;
                    case "cardExpiry":
                        if (!validateCardExpiry(value)) {
                            isValid = false;
                            errorMessage = "Digite uma data válida";
                        }
                        break;
                    case "cardCvv":
                        if (value.length < 3) {
                            isValid = false;
                            errorMessage = "Digite um CVV válido";
                        }
                        break;
                }
            }

            if (isValid) {
                field.classList.add("success");
            } else {
                field.classList.add("error");
                if (errorEl) {
                    errorEl.textContent = errorMessage;
                    errorEl.classList.add("show");
                }
            }

            return isValid;
        }

        function validateEmail(email) {
            const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
            return emailRegex.test(email);
        }

        function validateCPF(cpf) {
            cpf = cpf.replace(/\D/g, '');
            if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

            let sum = 0;
            for (let i = 0; i < 9; i++) {
                sum += parseInt(cpf.charAt(i)) * (10 - i);
            }
            let remainder = 11 - (sum % 11);
            if (remainder === 10 || remainder === 11) remainder = 0;
            if (remainder !== parseInt(cpf.charAt(9))) return false;

            sum = 0;
            for (let i = 0; i < 10; i++) {
                sum += parseInt(cpf.charAt(i)) * (11 - i);
            }
            remainder = 11 - (sum % 11);
            if (remainder === 10 || remainder === 11) remainder = 0;
            if (remainder !== parseInt(cpf.charAt(10))) return false;

            return true;
        }

        function validatePhone(phone) {
            const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
            return phoneRegex.test(phone);
        }

        function validateZipCode(zipCode) {
            const zipRegex = /^\d{5}-\d{3}$/;
            return zipRegex.test(zipCode);
        }

        function validateCardNumber(cardNumber) {
            const cleanNumber = cardNumber.replace(/\s/g, '');
            return cleanNumber.length >= 13 && cleanNumber.length <= 19;
        }

        function validateCardExpiry(expiry) {
            const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
            if (!expiryRegex.test(expiry)) return false;

            const [month, year] = expiry.split('/');
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear() % 100;
            const currentMonth = currentDate.getMonth() + 1;

            const cardYear = parseInt(year);
            const cardMonth = parseInt(month);

            if (cardYear < currentYear || (cardYear === currentYear && cardMonth < currentMonth)) {
                return false;
            }

            return true;
        }

        async function handleContactSubmit(e) {
            e.preventDefault();
            if (validateCurrentStep()) {
                const formData = new FormData(e.target);
                const contactData = {
                    email: formData.get('email'),
                    firstName: formData.get('firstName'),
                    cpf: formData.get('cpf'),
                    phone: formData.get('phone')
                };

                window.checkoutData = { ...window.checkoutData, ...contactData };
                goToStep(2);
            }
        }

        async function handleShippingSubmit(e) {
            e.preventDefault();
            if (validateCurrentStep()) {
                const formData = new FormData(e.target);
                const shippingData = {
                    zipCode: formData.get('zipCode'),
                    address: formData.get('address'),
                    number: formData.get('number'),
                    complement: formData.get('complement'),
                    neighborhood: formData.get('neighborhood'),
                    city: formData.get('city'),
                    state: formData.get('state'),
                    shippingMethod: selectedShipping
                };

                window.checkoutData = { ...window.checkoutData, ...shippingData };
                goToStep(3);
            }
        }

        async function handlePaymentSubmit(e) {
            console.log("handlePaymentSubmit chamado.");
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.classList.add('btn-loading');
            
            document.getElementById('loadingOverlay').style.display = 'flex';
            
            try {
                const orderData = {
                    ...window.checkoutData,
                    paymentMethod: selectedPayment,
                    subtotal: cartData.subtotal,
                    shippingCost: getShippingCost(),
                    total: calculateTotal()
                };

                if (selectedPayment === 'pix') {
                    await processPixPayment(orderData);
                } else if (selectedPayment === 'credit') {
                    await processCreditCardPayment(orderData, e.target);
                } else if (selectedPayment === 'boleto') {
                    await processBoletoPayment(orderData);
                }
            } catch (error) {
                console.error('Erro:', error);
                alert(error.message || 'Erro ao finalizar pedido. Tente novamente.');
            } finally {
                submitBtn.classList.remove('btn-loading');
                document.getElementById('loadingOverlay').style.display = 'none';
            }
        }

        async function processPixPayment(orderData) {
  console.log("processPixPayment chamado com orderData:", orderData);

  const pixData = {
    paymentMethod: 'PIX',
    amount: Math.round(orderData.total * 100),
    customer: {
      name: orderData.firstName,
      email: orderData.email,
      document: orderData.cpf.replace(/\D/g, ''),
      phone: orderData.phone.replace(/\D/g, '')
    },
    shipping: {
      address: {
        street: orderData.address,
        streetNumber: orderData.number,
        complement: orderData.complement || '',
        neighborhood: orderData.neighborhood,
        city: orderData.city,
        state: orderData.state,
        country: 'BR',
        zipCode: orderData.zipCode.replace(/\D/g, '')
      }
    },
    items: [{
      title: String('Produto'), // ✅ obrigatório
      quantity: 1,
      price: Math.round(orderData.total * 100),
      description: String('Pedido da loja online') // ✅ obrigatório
    }],
    ip: '127.0.0.1'
  };

  // Log completo no console para depuração
  console.log("📦 Payload final enviado:", JSON.stringify(pixData, null, 2));

  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/pix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pixData)
    });

    const result = await response.json();
    console.log("Resposta do proxy:", result);

    // ... (código anterior)
    if (response.ok && (result.status === 'waiting_payment' || result.status === 'pending')) {
      // Correção: Chamar a função para exibir os detalhes do PIX na tela
      showPixPaymentDetails(result); 
      showSuccessNotification('PIX gerado com sucesso!'); // Esta linha é opcional
    } else {
// ... (código posterior)
  console.error('⚠️ Resposta recebida, mas status inesperado:', result.status);
  throw new Error(result.message || 'Erro ao gerar PIX');
}
  } catch (error) {
    console.error('Erro PIX:', error);

    if (error.message.includes('fetch')) {
      console.log('Simulando resposta PIX para demonstração...');
      simulatePixPayment(orderData);
    } else {
      throw new Error('Erro ao processar pagamento PIX. Tente novamente.');
    }
  }
}


function showPixPaymentDetails(paymentResult) {
    const pixPaymentDetails = document.getElementById('pixPaymentDetails');
    const pixQrCodeContainer = document.getElementById('pixQrCode');
    const pixCodeText = document.getElementById('pixCodeText');
    
    // Mostra a seção de detalhes do pagamento PIX
    pixPaymentDetails.style.display = 'block';
    
    // Verifica se os dados do PIX foram recebidos corretamente
    if (paymentResult.pix && paymentResult.pix.qrcode) {
        const pixCode = paymentResult.pix.qrcode;
        
        // 1. Exibe o código "Copia e Cola"
        pixCodeText.textContent = pixCode;
            

        // 3. Encontra o botão "Finalizar Pedido" dentro do formulário de pagamento
        const paymentForm = document.getElementById('paymentForm');
        const submitButton = paymentForm.querySelector('button[type="submit"]');

        if (submitButton) {
            // 4. Altera o texto e a aparência do botão
            submitButton.textContent = 'Já Paguei';
            submitButton.style.backgroundColor = '#10b981'; // Cor de sucesso (verde)
            submitButton.style.borderColor = '#10b981';

            // 5. Remove o evento de submit original para evitar nova cobrança
            submitButton.type = 'button'; // Muda o tipo para não submeter o formulário

            // 6. Adiciona o evento de clique para redirecionar para um link externo
            submitButton.onclick = function() {
                // **IMPORTANTE**: Substitua 'https://seusite.com/confirmacao' pelo link desejado
                window.location.href = 'https://seusite.com/confirmacao'; 
            };
        }
        // --- FIM DA MODIFICAÇÃO ---

    } else {
        // Tratamento de erro caso os dados do PIX não sejam encontrados
        pixQrCodeContainer.innerHTML = "Não foi possível obter os dados do PIX.";
        pixCodeText.textContent = "Tente novamente.";
        console.error("Estrutura de dados PIX inesperada:", paymentResult );
    }
    
    // Inicia o contador de tempo para a validade do PIX
    startPixTimer(900); // 15 minutos
}

        function startPixTimer(seconds) {
            const timerElement = document.getElementById('pixTimeRemaining');
            let timeLeft = seconds;
            
            pixTimer = setInterval(() => {
                const minutes = Math.floor(timeLeft / 60);
                const secs = timeLeft % 60;
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                
                if (timeLeft <= 0) {
                    clearInterval(pixTimer);
                    timerElement.textContent = 'Expirado';
                    alert('O código PIX expirou. Por favor, gere um novo código.');
                }
                
                timeLeft--;
            }, 1000);
        }

        function copyPixCode() {
            const pixCodeText = document.getElementById('pixCodeText');
            const copyButton = document.getElementById('pixCopyButton');
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(pixCodeText.textContent).then(() => {
                    copyButton.textContent = 'Copiado!';
                    copyButton.classList.add('copied');
                    
                    setTimeout(() => {
                        copyButton.textContent = 'Copiar Código';
                        copyButton.classList.remove('copied');
                    }, 2000);
                });
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = pixCodeText.textContent;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                copyButton.textContent = 'Copiado!';
                copyButton.classList.add('copied');
                
                setTimeout(() => {
                    copyButton.textContent = 'Copiar Código';
                    copyButton.classList.remove('copied');
                }, 2000);
            }
        }

        // CORREÇÃO CORS: Função corrigida para usar proxy reverso
        async function processCreditCardPayment(orderData, form) {
            const formData = new FormData(form);
            
            const cardData = {
                paymentMethod: 'CARD',
                amount: Math.round(orderData.total * 100),
                installments: parseInt(formData.get('installments')),
                customer: {
                    name: orderData.firstName,
                    email: orderData.email,
                    document: orderData.cpf.replace(/\D/g, ''),
                    phone: orderData.phone.replace(/\D/g, '')
                },
                card: {
                    number: formData.get('cardNumber').replace(/\s/g, ''),
                    holderName: formData.get('cardName'),
                    expiryMonth: formData.get('cardExpiry').split('/')[0],
                    expiryYear: '20' + formData.get('cardExpiry').split('/')[1],
                    cvv: formData.get('cardCvv')
                },
                shipping: {
                    address: orderData.address,
                    number: orderData.number,
                    complement: orderData.complement || '',
                    neighborhood: orderData.neighborhood,
                    city: orderData.city,
                    state: orderData.state,
                    zipCode: orderData.zipCode.replace(/\D/g, '')
                },
                items: [{
                    name: 'Produto',
                    quantity: 1,
                    price: Math.round(orderData.total * 100)
                }],
                description: 'Pedido da loja online',
                ip: '127.0.0.1'
            };

            try {
                // CORREÇÃO: Usar proxy reverso
                const response = await fetch(`${BACKEND_API_BASE_URL}/credit-card`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(cardData)
                });

                const result = await response.json();
                
                if (response.ok) {
                    if (result.status === 'approved') {
                        showSuccessNotification('Pagamento aprovado! Pedido finalizado com sucesso.');
                    } else if (result.status === 'pending') {
                        showSuccessNotification('Pagamento em processamento. Você receberá uma confirmação em breve.');
                    } else {
                        throw new Error('Pagamento rejeitado. Verifique os dados do cartão.');
                    }
                } else {
                    throw new Error(result.message || 'Erro ao processar pagamento');
                }
            } catch (error) {
                // Simular aprovação para demonstração se o proxy não estiver disponível
                if (error.message.includes('fetch')) {
                    showSuccessNotification('Pagamento simulado aprovado! (Demonstração)');
                } else {
                    throw error;
                }
            }
        }

        // CORREÇÃO CORS: Função corrigida para usar proxy reverso
        async function processBoletoPayment(orderData) {
            const boletoData = {
                paymentMethod: 'BOLETO',
                amount: Math.round(orderData.total * 100),
                customer: {
                    name: orderData.firstName,
                    email: orderData.email,
                    document: orderData.cpf.replace(/\D/g, ''),
                    phone: orderData.phone.replace(/\D/g, '')
                },
                boleto: {
                    expiresIn: 3
                },
                shipping: {
                    address: orderData.address,
                    number: orderData.number,
                    complement: orderData.complement || '',
                    neighborhood: orderData.neighborhood,
                    city: orderData.city,
                    state: orderData.state,
                    zipCode: orderData.zipCode.replace(/\D/g, '')
                },
                items: [{
                    name: 'Produto',
                    quantity: 1,
                    price: Math.round(orderData.total * 100)
                }],
                description: 'Pedido da loja online',
                ip: '127.0.0.1'
            };

            try {
                // CORREÇÃO: Usar proxy reverso
                const response = await fetch(`${BACKEND_API_BASE_URL}/boleto`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(boletoData)
                });

                const result = await response.json();
                
                if (response.ok && result.status === 'pending') {
                    showSuccessNotification('Boleto gerado com sucesso! Você receberá o boleto por e-mail para pagamento.');
                } else {
                    throw new Error(result.message || 'Erro ao gerar boleto');
                }
            } catch (error) {
                // Simular geração de boleto para demonstração se o proxy não estiver disponível
                if (error.message.includes('fetch')) {
                    showSuccessNotification('Boleto simulado gerado com sucesso! (Demonstração)');
                } else {
                    throw error;
                }
            }
        }

        function showSuccessNotification(message) {
            const notification = document.getElementById('successNotification');
            notification.textContent = message;
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 5000);
        }

        function getShippingCost() {
            switch (selectedShipping) {
                case 'express': return 15.90;
                case 'same-day': return 29.90;
                default: return 0;
            }
        }

        function calculateTotal() {
            let total = cartData.subtotal + getShippingCost();
            if (selectedPayment === 'credit') {
                total = total * 1.05;
            }
            return total;
        }

        function selectShipping() {
            document.querySelectorAll('.shipping-option').forEach(option => {
                option.classList.remove('selected');
            });
            this.classList.add('selected');
            selectedShipping = this.dataset.shipping;
            updateShippingCost();
        }

        function updateShippingCost() {
            const shippingCostEl = document.getElementById('shippingCost');
            const mobileShippingCostEl = document.getElementById('mobileShippingCost');
            const totalPriceEl = document.getElementById('totalPrice');
            const mobileTotalPriceEl = document.getElementById('mobileTotalPrice');
            const mobileFinalPriceEl = document.getElementById('mobileFinalPrice');
            
            let shippingCost = 0;
            let basePrice = cartData.subtotal;
            let shippingText = '';

            switch (selectedShipping) {
                case 'standard':
                    shippingText = 'GRÁTIS';
                    shippingCost = 0;
                    break;
                case 'express':
                    shippingText = 'R$ 15,90';
                    shippingCost = 15.90;
                    break;
                case 'same-day':
                    shippingText = 'R$ 29,90';
                    shippingCost = 29.90;
                    break;
            }

            let total = basePrice + shippingCost;
            let creditCardFee = 0;
            
            if (selectedPayment === 'credit' && currentStep === 3) {
                creditCardFee = total * (CREDIT_CARD_FEE_PERCENTAGE / 100);
                total = total + creditCardFee;
                
                document.getElementById('creditCardFeeRow').style.display = 'flex';
                document.getElementById('mobileCreditCardFeeRow').style.display = 'flex';
                
                const creditCardFeeFormatted = `+R$ ${creditCardFee.toFixed(2).replace('.', ',')}`;
                document.getElementById('creditCardFee').textContent = creditCardFeeFormatted;
                document.getElementById('mobileCreditCardFee').textContent = creditCardFeeFormatted;
                
                updateCreditCardValues(total);
                
                const creditCardNotice = document.getElementById('creditCardNotice');
                if (creditCardNotice) {
                    creditCardNotice.style.display = 'block';
                }
            } else {
                document.getElementById('creditCardFeeRow').style.display = 'none';
                document.getElementById('mobileCreditCardFeeRow').style.display = 'none';
                
                const creditCardNotice = document.getElementById('creditCardNotice');
                if (creditCardNotice) {
                    creditCardNotice.style.display = 'none';
                }
            }
            
            updatePaymentMethodValues(total - creditCardFee);

            const totalFormatted = `R$ ${total.toFixed(2).replace('.', ',')}`;
            
            if (shippingCostEl) shippingCostEl.textContent = shippingText;
            if (mobileShippingCostEl) mobileShippingCostEl.textContent = shippingText;
            if (totalPriceEl) totalPriceEl.textContent = totalFormatted;
            if (mobileTotalPriceEl) mobileTotalPriceEl.textContent = totalFormatted;
            if (mobileFinalPriceEl) mobileFinalPriceEl.textContent = totalFormatted;
        }

        function updateCreditCardValues(totalWithFee) {
            const creditCardTotalValueEl = document.getElementById('creditCardTotalValue');
            
            if (creditCardTotalValueEl) {
                creditCardTotalValueEl.textContent = `R$ ${totalWithFee.toFixed(2).replace('.', ',')}`;
            }
            
            updateInstallmentOptions(totalWithFee);
        }

        function updatePaymentMethodValues(baseTotal) {
            const pixValueEl = document.getElementById('pixValue');
            const boletoValueEl = document.getElementById('boletoValue');
            
            const baseFormatted = `R$ ${baseTotal.toFixed(2).replace('.', ',')}`;
            
            if (pixValueEl) {
                pixValueEl.textContent = baseFormatted;
            }
            if (boletoValueEl) {
                boletoValueEl.textContent = baseFormatted;
            }
        }

        function updateInstallmentOptions(total) {
            const installmentsSelect = document.getElementById('installments');
            if (!installmentsSelect) return;
            
            while (installmentsSelect.children.length > 1) {
                installmentsSelect.removeChild(installmentsSelect.lastChild);
            }
            
            const installmentOptions = [
                { value: 1, text: `1x R$ ${total.toFixed(2).replace('.', ',')} à vista` },
                { value: 2, text: `2x R$ ${(total / 2).toFixed(2).replace('.', ',')} sem juros` },
                { value: 3, text: `3x R$ ${(total / 3).toFixed(2).replace('.', ',')} sem juros` },
                { value: 4, text: `4x R$ ${(total / 4).toFixed(2).replace('.', ',')} sem juros` },
                { value: 5, text: `5x R$ ${(total / 5).toFixed(2).replace('.', ',')} sem juros` },
                { value: 6, text: `6x R$ ${(total / 6).toFixed(2).replace('.', ',')} sem juros` },
                { value: 7, text: `7x R$ ${(total * 1.05 / 7).toFixed(2).replace('.', ',')} com juros` },
                { value: 8, text: `8x R$ ${(total * 1.08 / 8).toFixed(2).replace('.', ',')} com juros` },
                { value: 9, text: `9x R$ ${(total * 1.12 / 9).toFixed(2).replace('.', ',')} com juros` },
                { value: 10, text: `10x R$ ${(total * 1.15 / 10).toFixed(2).replace('.', ',')} com juros` },
                { value: 11, text: `11x R$ ${(total * 1.18 / 11).toFixed(2).replace('.', ',')} com juros` },
                { value: 12, text: `12x R$ ${(total * 1.20 / 12).toFixed(2).replace('.', ',')} com juros` }
            ];
            
            installmentOptions.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                installmentsSelect.appendChild(optionEl);
            });
        }

        function selectPayment() {
            document.querySelectorAll(".payment-method").forEach(method => {
                method.classList.remove("selected");
            });
            this.parentElement.classList.add("selected");
            selectedPayment = this.parentElement.dataset.payment;

            // Get all credit card input fields
            const creditCardFields = [
                document.getElementById("cardNumber"),
                document.getElementById("cardName"),
                document.getElementById("cardExpiry"),
                document.getElementById("cardCvv"),
                document.getElementById("installments")
            ];

            if (selectedPayment === "pix" || selectedPayment === "boleto") {
                // Remove 'required' attribute for PIX/Boleto
                creditCardFields.forEach(field => {
                    if (field) {
                        field.removeAttribute("required");
                        field.classList.remove("error", "success");
                        const errorEl = document.getElementById(field.id + "Error");
                        if (errorEl) errorEl.classList.remove("show");
                    }
                });
            } else if (selectedPayment === "credit") {
                // Add 'required' attribute back for Credit Card
                creditCardFields.forEach(field => {
                    if (field) {
                        field.setAttribute("required", "");
                    }
                });
            }

            const creditCardNotice = document.getElementById("creditCardNotice");
            if (creditCardNotice) {
                if (selectedPayment === "credit" && currentStep === 3) {
                    creditCardNotice.style.display = "block";
                } else {
                    creditCardNotice.style.display = "none";
                }
            }

            updateShippingCost();
        }

        function applyCoupon() {
            const couponInput = document.getElementById('discountInput');
            const coupon = couponInput.value.trim().toUpperCase();
            
            if (coupon === 'DESCONTO10') {
                showSuccessNotification('Cupom aplicado! 10% de desconto');
                couponInput.value = '';
            } else if (coupon) {
                alert('Cupom inválido');
            }
        }
