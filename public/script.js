const API_BASE = '/api/v1';

const APP_URLS = {
    android: 'https://play.google.com/store/apps/details?id=br.com.segware.mysecurity.app88&hl=pt_BR',
    ios: 'https://apps.apple.com/br/app/viptech/id1304456087'
};

function getDeviceFingerprint() {
    const ua = navigator.userAgent || '';
    let type = 'Desktop (' + (navigator.platform || 'PC') + ')';
    let os = 'desktop';

    if (/android/i.test(ua)) {
        type = 'Android';
        os = 'android';
    } else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
        type = 'iOS';
        os = 'ios';
    }

    return {
        type: type,
        os: os,
        userAgent: ua,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
}

const deviceMeta = getDeviceFingerprint();
document.getElementById('disp-device').innerText = deviceMeta.type;
document.getElementById('device-icon').className =
    deviceMeta.os === 'android' ? 'fa-brands fa-android' :
        deviceMeta.os === 'ios' ? 'fa-brands fa-apple' : 'fa-solid fa-desktop';

// --- Cliente via parâmetro de URL ---
// Uso: seusite.com/?cliente=NomeOuCodigoDoCliente
// Se o parâmetro vier preenchido, o campo Cliente/Conta é travado (não editável)
// tanto no Formulário quanto no Modo Chat.
const urlParams = new URLSearchParams(window.location.search);
const clienteParam = urlParams.get('cliente');
const clienteLocked = !!clienteParam;

function applyClientLock() {
    if (!clienteLocked) return;

    const inputEl = document.getElementById('f_search_client');
    const hiddenEl = document.getElementById('f_cliente_selected');
    const wrapperEl = document.getElementById('client-input-wrapper');
    const hint = document.getElementById('client-locked-hint');
    const resultsBox = document.getElementById('form-search-results');

    inputEl.value = clienteParam;
    hiddenEl.value = clienteParam;
    inputEl.disabled = true;
    inputEl.readOnly = true;

    if (wrapperEl) wrapperEl.classList.add('locked');
    if (hint) hint.style.display = 'block';
    if (resultsBox) resultsBox.style.display = 'none';
}
applyClientLock();

function toggleAppInput(enabled) {
    const passInput = document.getElementById('f_pass_app');
    const downloadContainer = document.getElementById('app-download-container');

    passInput.disabled = !enabled;
    if (enabled) {
        passInput.required = true;
        if (deviceMeta.os === 'android' || deviceMeta.os === 'ios') {
            const url = APP_URLS[deviceMeta.os];
            downloadContainer.innerHTML = `
                        <div class="app-download-box">
                            <span style="font-size:0.78rem;"><i class="fa-solid fa-circle-down" style="color:var(--accent);"></i> App para ${deviceMeta.type}</span>
                            <a href="${url}" target="_blank" rel="noopener noreferrer">Baixar App</a>
                        </div>`;
            downloadContainer.style.display = 'block';
        }
    } else {
        passInput.required = false;
        passInput.value = '';
        downloadContainer.style.display = 'none';
    }
}

async function checkIpOrigin() {
    try {
        const res = await fetch(`${API_BASE}/check-ip`);
        const data = await res.json();
        if (data.isAllowed) {
            document.getElementById('adminBtn').style.display = 'block';
            document.getElementById('btn-tab-admin').style.display = 'flex';
        }
    } catch (e) { console.error('Erro na validação de acesso IP:', e); }
}
checkIpOrigin();

let searchTimer = null;
async function handleClientSearch(query) {
    if (clienteLocked) return; // Busca desativada quando o cliente vem travado por parâmetro

    clearTimeout(searchTimer);
    const resultsBox = document.getElementById('form-search-results');
    if (query.length < 3) { resultsBox.style.display = 'none'; return; }

    searchTimer = setTimeout(async () => {
        try {
            const res = await fetch(`${API_BASE}/search-client?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            const list = [...(data.accounts || []), ...(data.clients || [])];

            resultsBox.innerHTML = '';
            if (list.length === 0) {
                resultsBox.innerHTML = '<div class="search-item">Nenhum cliente encontrado</div>';
            } else {
                list.forEach(item => {
                    const name = item.tradeName || item.companyName;
                    const code = item.accountCode ? ` (Cod: ${item.accountCode})` : '';
                    const div = document.createElement('div');
                    div.className = 'search-item';
                    div.innerText = `${name}${code}`;
                    div.onclick = () => {
                        document.getElementById('f_search_client').value = `${name}${code}`;
                        document.getElementById('f_cliente_selected').value = name;
                        resultsBox.style.display = 'none';
                    };
                    resultsBox.appendChild(div);
                });
            }
            resultsBox.style.display = 'block';
        } catch (e) { console.error('Erro na busca:', e); }
    }, 400);
}

let chatStarted = false;

function switchTab(type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    if (type === 'form') {
        document.getElementById('btn-tab-form').classList.add('active');
        document.getElementById('tab-form').classList.add('active');
    } else if (type === 'chat') {
        document.getElementById('btn-tab-chat').classList.add('active');
        document.getElementById('tab-chat').classList.add('active');
        if (!chatStarted) { chatStarted = true; startChat(); }
    } else if (type === 'admin') {
        document.getElementById('btn-tab-admin').classList.add('active');
        document.getElementById('tab-admin').classList.add('active');
        loadAdminData();
    }
}

async function loadAdminData() {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '<tr><td colspan="13">Carregando dados...</td></tr>';
    try {
        const res = await fetch(`${API_BASE}/admin/passwords`);
        const data = await res.json();
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13">Nenhum registro cadastrado até o momento.</td></tr>';
            return;
        }

        // Substitua o loop 'data.forEach(row => { ... })' dentro do loadAdminData por este:

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td><strong>#${row.id}</strong></td>
        <td>${row.cliente || '-'}</td>
        <td>${row.name || '-'}</td>
        <td>${row.email || '-'}</td>
        <td>${row.phone || '-'}</td>
        <td>${row.cpf || '-'}</td>
        <td>${row.rg || '-'}</td>
        <td>${row.function || '-'}</td>
        <td><span class="badge-app ${row.app ? 'yes' : 'no'}">${row.app ? 'SIM' : 'NÃO'}</span></td>
        <td><code>${row.pass_app || '-'}</code></td>
        <td><code>${row.pass_alr || '-'}</code></td>
        <td><code>${row.pass_verbal || '-'}</code></td>
        <td><small>${row.device || '-'}</small></td>
        <td>
            <button 
                class="btn-status-toggle ${row.vist ? 'status-sim' : 'status-nao'}" 
                onclick="toggleVistStatus(${row.id}, ${row.vist})">
                ${row.vist ? 'VALIDADO' : 'PENDENTE'}
            </button>
        </td>
    `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="13">Erro ao carregar registros.</td></tr>';
    }
}

document.getElementById('traditionalForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        device: deviceMeta.type,
        device_meta: deviceMeta,
        cliente: document.getElementById('f_cliente_selected').value || document.getElementById('f_search_client').value,
        name: document.getElementById('f_name').value,
        email: document.getElementById('f_email').value,
        phone: document.getElementById('f_phone').value,
        cpf: document.getElementById('f_cpf').value,
        rg: document.getElementById('f_rg').value,
        function: document.getElementById('f_function').value,
        app: document.getElementById('f_app').checked,
        pass_app: document.getElementById('f_app').checked ? document.getElementById('f_pass_app').value : '',
        pass_alr: document.getElementById('f_pass_alr').value,
        pass_verbal: document.getElementById('f_pass_verbal').value,
    };

    await sendPayload(payload, 'form');
});

const chatSteps = [
    { key: 'cliente', label: 'Qual o nome ou código do cliente/conta?' },
    { key: 'name', label: 'Qual é o seu nome completo?' },
    { key: 'email', label: 'Informe seu e-mail:' },
    { key: 'phone', label: 'Seu telefone:' },
    { key: 'cpf', label: 'Seu CPF (ou "pular"):' },
    { key: 'rg', label: 'Seu RG (ou "pular"):' },
    { key: 'function', label: 'Sua Função/Cargo:' },
    { key: 'app', label: 'Você deseja utilizar o Aplicativo Viptech? (Responda "sim" ou "nao")' },
    { key: 'pass_app', label: 'Qual a Senha para acesso ao App?' },
    { key: 'pass_alr', label: 'Senha do Alarme: São 4 dígitos' },
    { key: 'pass_verbal', label: 'Senha Verbal / Contra-Senha:' }
];

let chatStep = 0;
let chatData = {};

function addMsg(text, sender) {
    const box = document.getElementById('chatHistory');
    const msg = document.createElement('div');
    msg.className = `msg ${sender}`;
    msg.innerHTML = text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
}

function startChat() {
    if (clienteLocked) {
        chatData['cliente'] = clienteParam;
        syncChatToForm('cliente', clienteParam); // 🔄 Garante que o formulário receba o valor no inicio
        chatStep = 1;
        addMsg(`Olá! Sou o assistente de cadastro. Detectei que você está acessando via <strong>${deviceMeta.type}</strong>.`, 'bot');
        setTimeout(() => addMsg(`Cliente já definido como <strong>${clienteParam}</strong> ✅`, 'bot'), 350);
        setTimeout(() => addMsg(chatSteps[chatStep].label, 'bot'), 750);
    } else {
        addMsg(`Olá! Sou o assistente de cadastro. Detectei que você está acessando via <strong>${deviceMeta.type}</strong>.`, 'bot');
        setTimeout(() => addMsg(chatSteps[0].label, 'bot'), 400);
    }
}

async function sendChatAnswer() {
    const input = document.getElementById('chatInput');
    const val = input.value.trim();
    if (!val) return;

    const currentKey = chatSteps[chatStep].key;

    // Lista de chaves obrigatórias
    const requiredKeys = ['cliente', 'name', 'email', 'phone', 'pass_alr', 'pass_verbal'];

    // Bloqueia "pular" em campos obrigatórios
    if (requiredKeys.includes(currentKey) && val.toLowerCase() === 'pular') {
        addMsg(val, 'user');
        input.value = '';
        setTimeout(() => addMsg('⚠️ Este campo é obrigatório e não pode ser pulado. Por favor, informe o dado solicitado:', 'bot'), 300);
        return;
    }

    // Validação da Senha do Alarme (exatamente 4 dígitos numéricos)
    if (currentKey === 'pass_alr') {
        const cleanVal = val.replace(/\D/g, '');
        if (cleanVal.length !== 4 || val.length !== 4) {
            addMsg(val, 'user');
            input.value = '';
            setTimeout(() => addMsg('⚠️ A Senha do Alarme precisa ter exatamente 4 dígitos numéricos. Tente novamente:', 'bot'), 300);
            return;
        }
    }

    addMsg(val, 'user');
    input.value = '';

    // Lógica para o campo do APLICATIVO
    if (currentKey === 'app') {
        const isYes = val.toLowerCase().includes('s') || val.toLowerCase() === 'sim';
        chatData['app'] = isYes;
        syncChatToForm('app', isYes); // 🔄 Sincroniza o checkbox no formulário

        if (isYes) {
            if (!chatData['email'] || chatData['email'].trim() === '') {
                setTimeout(() => {
                    addMsg('⚠️ Para utilizar o Aplicativo Viptech, é obrigatório possuir um e-mail cadastrado.', 'bot');
                    chatSteps.splice(chatStep + 1, 0, { key: 'email_retry', label: 'Por favor, informe seu e-mail para o acesso ao App:' });
                    chatStep++;
                    addMsg(chatSteps[chatStep].label, 'bot');
                }, 400);
                return;
            }

            if (deviceMeta.os === 'android' || deviceMeta.os === 'ios') {
                const url = APP_URLS[deviceMeta.os];
                setTimeout(() => {
                    addMsg(`Baixe o app se necessário: <a href="${url}" target="_blank" style="color:var(--accent); font-weight:bold;">Clique Aqui para Baixar</a>.`, 'bot');
                }, 300);
            }
        } else {
            chatData['pass_app'] = '';
            syncChatToForm('pass_app', ''); // 🔄 Limpa a senha do app no formulário
            const passAppIndex = chatSteps.findIndex(step => step.key === 'pass_app');
            if (passAppIndex !== -1 && chatStep < passAppIndex) {
                chatStep = passAppIndex; 
            }
        }
    } 
    // Re-tentativa de e-mail (caso o usuário tenha sido obrigado a informar após aceitar o app)
    else if (currentKey === 'email_retry') {
        if (val.toLowerCase() === 'pular' || !val) {
            setTimeout(() => addMsg('⚠️ É necessário informar um e-mail válido para usar o aplicativo:', 'bot'), 300);
            return;
        }
        chatData['email'] = val;
        syncChatToForm('email', val); // 🔄 Sincroniza o e-mail no formulário
    } 
    // Captura os demais campos
    else {
        const finalVal = (val.toLowerCase() === 'pular') ? '' : val;
        chatData[currentKey] = finalVal;
        syncChatToForm(currentKey, finalVal); // 🔄 Sincroniza o campo no formulário em tempo real
    }

    chatStep++;

    // Próxima pergunta ou envio
    if (chatStep < chatSteps.length) {
        setTimeout(() => addMsg(chatSteps[chatStep].label, 'bot'), 500);
    } else {
        setTimeout(async () => {
            addMsg('Obrigado! Salvando suas credenciais...', 'bot');
            await sendPayload({ device: deviceMeta.type, device_meta: deviceMeta, ...chatData }, 'chat');
        }, 600);
    }
}

async function sendPayload(data, origin) {
    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            // 🚫 Desabilita o formulário tradicional para evitar envios duplicados
            const form = document.getElementById('traditionalForm');
            if (form) {
                // Desativa todos os campos e o botão de envio do formulário
                const elements = form.querySelectorAll('input, button');
                elements.forEach(el => el.disabled = true);
                
                // Oculta o formulário e exibe a tela de sucesso
                form.style.display = 'none';
                document.getElementById('success-screen').style.display = 'flex';
            }

            if (origin === 'chat') {
                addMsg('✅ Cadastro realizado com sucesso!', 'bot');
                // Oculta a área de digitação do chat para impedir novos envios pelo bot
                const chatInputGroup = document.getElementById('chatInputGroup');
                if (chatInputGroup) {
                    chatInputGroup.style.display = 'none';
                }
            }
        } else {
            alert('Erro ao enviar o cadastro. Tente novamente.');
        }
    } catch (e) {
        console.error('Erro no envio:', e);
        alert('Erro na conexão com o servidor.');
    }
}

// Máscara de Telefone: (00) 0000-0000 ou (00) 00000-0000
function formatarTelefone(value) {
    value = value.replace(/\D/g, ''); // Remove tudo que não é dígito
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2'); // Coloca parênteses no DDD
    value = value.replace(/(\d)(\d{4})$/, '$1-$2'); // Coloca hífen nos últimos 4 dígitos
    return value;
}

// Máscara de CPF: 000.000.000-00
function formatarCPF(value) {
    value = value.replace(/\D/g, ''); // Remove tudo que não é dígito
    value = value.replace(/(\d{3})(\d)/, '$1.$2'); // Ponto após os primeiros 3 dígitos
    value = value.replace(/(\d{3})(\d)/, '$1.$2'); // Ponto após os 6 dígitos
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); // Hífen após os 9 dígitos
    return value;
}

// Máscara de RG: 00.000.000-X (Aceita números e 'X'/'x' no final)
function formatarRG(value) {
    value = value.replace(/[^0-9Xx]/g, ''); // Permite números e a letra X
    value = value.replace(/(\d{2})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})([0-9Xx]{1})$/, '$1-$2');
    return value;
}

async function toggleVistStatus(id, currentStatus) {
    const newStatus = !currentStatus; // Inverte true -> false ou false -> true

    try {
        const res = await fetch(`${API_BASE}/admin/passwords/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vist: newStatus })
        });

        if (res.ok) {
            // Recarrega a tabela para atualizar a interface com o novo status
            loadAdminData();
        } else {
            alert('Não foi possível atualizar o status do registro.');
        }
    } catch (e) {
        console.error('Erro ao atualizar status:', e);
        alert('Erro ao se conectar com o servidor.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tooltips = document.querySelectorAll('.info-tooltip');

    tooltips.forEach(tooltip => {
        tooltip.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que o evento feche o tooltip imediatamente
            
            // Fecha outros tooltips abertos antes de abrir o atual
            tooltips.forEach(item => {
                if (item !== tooltip) item.classList.remove('active');
            });

            // Alterna a exibição no elemento clicado
            tooltip.classList.toggle('active');
        });
    });

    // Se o usuário tocar fora do tooltip, ele fecha
    document.addEventListener('click', () => {
        tooltips.forEach(tooltip => tooltip.classList.remove('active'));
    });
});

// Função que sincroniza os dados do Chat diretamente nos inputs do Formulário HTML
function syncChatToForm(key, value) {
    const mapKeysToInputIds = {
        cliente: 'f_search_client',
        name: 'f_name',
        email: 'f_email',
        phone: 'f_phone',
        cpf: 'f_cpf',
        rg: 'f_rg',
        function: 'f_function',
        pass_app: 'f_pass_app',
        pass_alr: 'f_pass_alr',
        pass_verbal: 'f_pass_verbal'
    };

    // Preenche o input correspondente no formulário se ele existir
    if (mapKeysToInputIds[key]) {
        const inputEl = document.getElementById(mapKeysToInputIds[key]);
        if (inputEl) {
            inputEl.value = value;
            
            // Caso seja o campo cliente, preenchemos também o campo oculto
            if (key === 'cliente') {
                document.getElementById('f_cliente_selected').value = value;
            }
        }
    }

    // Se o campo for a resposta do Aplicativo (checkbox/toggle)
    if (key === 'app') {
        const appCheckbox = document.getElementById('f_app');
        if (appCheckbox) {
            appCheckbox.checked = value;
            toggleAppInput(value); // Ativa/desativa o campo de senha do App no formulário
        }
    }
}