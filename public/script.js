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
    { key: 'phone', label: 'Seu telefone (ou "pular"):' },
    { key: 'cpf', label: 'Seu CPF (ou "pular"):' },
    { key: 'rg', label: 'Seu RG (ou "pular"):' },
    { key: 'function', label: 'Sua Função/Cargo:' },
    { key: 'app', label: 'Você utiliza o Aplicativo Mobile? (Responda "sim" ou "nao")' },
    { key: 'pass_app', label: 'Qual a Senha da Aplicação?' },
    { key: 'pass_alr', label: 'Senha do Alarme (ou "pular"):' },
    { key: 'pass_verbal', label: 'Senha Verbal / Contra-Signo (ou "pular"):' }
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
        // Cliente já veio travado por parâmetro: pula a primeira pergunta
        chatData['cliente'] = clienteParam;
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

    addMsg(val, 'user');
    input.value = '';

    const currentKey = chatSteps[chatStep].key;

    if (currentKey === 'app') {
        const isYes = val.toLowerCase().includes('s');
        chatData['app'] = isYes;

        if (isYes && (deviceMeta.os === 'android' || deviceMeta.os === 'ios')) {
            const url = APP_URLS[deviceMeta.os];
            addMsg(`Baixe o app se necessário: <a href="${url}" target="_blank" style="color:var(--accent);">Clique Aqui</a>.`, 'bot');
        } else if (!isYes) {
            chatData['pass_app'] = '';
            chatStep++;
        }
    } else {
        chatData[currentKey] = (val.toLowerCase() === 'pular') ? '' : val;
    }

    chatStep++;

    if (chatStep < chatSteps.length) {
        setTimeout(() => addMsg(chatSteps[chatStep].label, 'bot'), 400);
    } else {
        setTimeout(async () => {
            addMsg('Obrigado! Salvando suas credenciais...', 'bot');
            await sendPayload({ device: deviceMeta.type, device_meta: deviceMeta, ...chatData }, 'chat');
        }, 500);
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
            if (origin === 'form') {
                document.getElementById('traditionalForm').style.display = 'none';
                document.getElementById('success-screen').style.display = 'flex';
            } else {
                addMsg('✅ Cadastro realizado com sucesso!', 'bot');
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