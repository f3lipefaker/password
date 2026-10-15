const API_BASE = '/api/v1';

const APP_URLS = {
    android: 'https://play.google.com/store/apps/details?id=br.com.segware.mysecurity.app88&hl=pt_BR',
    ios: 'https://apps.apple.com/br/app/viptech/id1304456087'
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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

// --- Cliente via parâmetro de URL ---
// Uso: seusite.com/?cliente=NomeOuCodigoDoCliente
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

// Mostrar / ocultar senha
function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input || input.disabled) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Ocultar' : 'Mostrar';
}

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
                    <span>Aplicativo disponível para ${escapeHtml(deviceMeta.type)}</span>
                    <a href="${url}" target="_blank" rel="noopener noreferrer">Baixar aplicativo</a>
                </div>`;
            downloadContainer.style.display = 'block';
        }
    } else {
        passInput.required = false;
        passInput.value = '';
        passInput.type = 'password';
        const toggleBtn = passInput.parentElement.querySelector('.toggle-pass');
        if (toggleBtn) toggleBtn.textContent = 'Mostrar';
        downloadContainer.style.display = 'none';
    }
}

async function checkIpOrigin() {
    try {
        const res = await fetch(`${API_BASE}/check-ip`);
        const data = await res.json();
        if (data.isAllowed) {
            document.getElementById('adminBtn').style.display = 'inline-block';
            document.getElementById('btn-tab-admin').style.display = 'block';
        }
    } catch (e) { console.error('Erro na validação de acesso IP:', e); }
}
checkIpOrigin();

let searchTimer = null;
async function handleClientSearch(query) {
    if (clienteLocked) return;

    clearTimeout(searchTimer);
    const resultsBox = document.getElementById('form-search-results');
    // Se o usuário editar o texto, a seleção anterior deixa de valer
    document.getElementById('f_cliente_selected').value = '';
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
                    const code = item.accountCode ? ` (Cód.: ${item.accountCode})` : '';
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

document.addEventListener('click', (e) => {
    const resultsBox = document.getElementById('form-search-results');
    if (resultsBox && !e.target.closest('#client-input-wrapper')) {
        resultsBox.style.display = 'none';
    }
});

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
    tbody.innerHTML = '<tr><td colspan="14" class="empty-row">Carregando registros...</td></tr>';
    try {
        const res = await fetch(`${API_BASE}/admin/passwords`);
        const data = await res.json();
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="14" class="empty-row">Nenhum registro cadastrado até o momento.</td></tr>';
            return;
        }

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(row.id)}</strong></td>
                <td>${escapeHtml(row.cliente) || '-'}</td>
                <td>${escapeHtml(row.name) || '-'}</td>
                <td>${escapeHtml(row.email) || '-'}</td>
                <td>${escapeHtml(row.phone) || '-'}</td>
                <td>${escapeHtml(row.cpf) || '-'}</td>
                <td>${escapeHtml(row.rg) || '-'}</td>
                <td>${escapeHtml(row.function) || '-'}</td>
                <td><span class="badge-app ${row.app ? 'yes' : 'no'}">${row.app ? 'Sim' : 'Não'}</span></td>
                <td><code>${escapeHtml(row.pass_app) || '-'}</code></td>
                <td><code>${escapeHtml(row.pass_alr) || '-'}</code></td>
                <td><code>${escapeHtml(row.pass_verbal) || '-'}</code></td>
                <td>${escapeHtml(row.device) || '-'}</td>
                <td>
                    <button type="button" class="btn-status-toggle ${row.vist ? 'status-sim' : 'status-nao'}"
                        onclick="toggleVistStatus(${Number(row.id)}, ${row.vist ? 'true' : 'false'})">
                        ${row.vist ? 'Validado' : 'Pendente'}
                    </button>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="14" class="empty-row">Não foi possível carregar os registros.</td></tr>';
    }
}

document.getElementById('traditionalForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const clienteValue = document.getElementById('f_cliente_selected').value || document.getElementById('f_search_client').value;
    if (!clienteValue.trim()) {
        alert('Informe o cliente ou a conta.');
        document.getElementById('f_search_client').focus();
        return;
    }

    const submitBtn = e.target.querySelector('.btn-submit');
    submitBtn.disabled = true;

    const payload = {
        device: deviceMeta.type,
        device_meta: deviceMeta,
        cliente: clienteValue,
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

    const ok = await sendPayload(payload, 'form');
    if (!ok) submitBtn.disabled = false;
});

const chatSteps = [
    { key: 'cliente', label: 'Informe o nome ou código do cliente/conta.' },
    { key: 'name', label: 'Informe seu nome completo.' },
    { key: 'email', label: 'Informe seu e-mail.' },
    { key: 'phone', label: 'Informe seu telefone.' },
    { key: 'cpf', label: 'Informe seu CPF (ou digite "pular").' },
    { key: 'rg', label: 'Informe seu RG (ou digite "pular").' },
    { key: 'function', label: 'Informe sua função ou cargo.' },
    { key: 'app', label: 'Utilizará o aplicativo Viptech? Responda "sim" ou "não".' },
    { key: 'pass_app', label: 'Defina a senha de acesso ao aplicativo.' },
    { key: 'pass_alr', label: 'Informe a senha do alarme (4 dígitos).' },
    { key: 'pass_verbal', label: 'Informe a senha verbal (contrassenha).' }
];

let chatStep = 0;
let chatData = {};

// sender: 'bot' | 'user'; tone: '' | 'warn' | 'ok'
function addMsg(text, sender, tone = '') {
    const box = document.getElementById('chatHistory');
    const msg = document.createElement('div');
    msg.className = `msg ${sender} ${tone}`.trim();
    msg.innerHTML = text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
}

function startChat() {
    addMsg(`Atendimento de cadastro iniciado. Dispositivo detectado: <strong>${escapeHtml(deviceMeta.type)}</strong>.`, 'bot');

    if (clienteLocked) {
        chatData['cliente'] = clienteParam;
        syncChatToForm('cliente', clienteParam);
        chatStep = 1;
        setTimeout(() => addMsg(`Cliente definido pelo link de acesso: <strong>${escapeHtml(clienteParam)}</strong>.`, 'bot', 'ok'), 300);
        setTimeout(() => addMsg(chatSteps[chatStep].label, 'bot'), 600);
    } else {
        setTimeout(() => addMsg(chatSteps[0].label, 'bot'), 300);
    }
}

async function sendChatAnswer() {
    const input = document.getElementById('chatInput');
    const val = input.value.trim();
    if (!val) return;

    const currentKey = chatSteps[chatStep].key;
    const requiredKeys = ['cliente', 'name', 'email', 'phone', 'pass_alr', 'pass_verbal'];

    // Bloqueia "pular" em campos obrigatórios
    if (requiredKeys.includes(currentKey) && val.toLowerCase() === 'pular') {
        addMsg(escapeHtml(val), 'user');
        input.value = '';
        setTimeout(() => addMsg('Este campo é obrigatório. Informe o dado solicitado.', 'bot', 'warn'), 250);
        return;
    }

    // Senha do alarme: exatamente 4 dígitos
    if (currentKey === 'pass_alr') {
        if (!/^\d{4}$/.test(val)) {
            addMsg('••••', 'user');
            input.value = '';
            setTimeout(() => addMsg('A senha do alarme deve ter exatamente 4 dígitos numéricos. Tente novamente.', 'bot', 'warn'), 250);
            return;
        }
    }

    // Senhas não ficam visíveis no histórico do chat
    const isSecret = ['pass_app', 'pass_alr', 'pass_verbal'].includes(currentKey);
    addMsg(isSecret ? '••••••' : escapeHtml(val), 'user');
    input.value = '';

    // Campo do aplicativo
    if (currentKey === 'app') {
        const normalized = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const isYes = /^s/.test(normalized);
        chatData['app'] = isYes;
        syncChatToForm('app', isYes);

        if (isYes) {
            if (!chatData['email'] || chatData['email'].trim() === '') {
                setTimeout(() => {
                    addMsg('Para utilizar o aplicativo Viptech é obrigatório ter um e-mail cadastrado.', 'bot', 'warn');
                    chatSteps.splice(chatStep + 1, 0, { key: 'email_retry', label: 'Informe seu e-mail para o acesso ao aplicativo.' });
                    chatStep++;
                    addMsg(chatSteps[chatStep].label, 'bot');
                }, 300);
                return;
            }

            if (deviceMeta.os === 'android' || deviceMeta.os === 'ios') {
                const url = APP_URLS[deviceMeta.os];
                setTimeout(() => {
                    addMsg(`Se ainda não instalou, <a href="${url}" target="_blank" rel="noopener noreferrer">baixe o aplicativo aqui</a>.`, 'bot');
                }, 250);
            }
        } else {
            chatData['pass_app'] = '';
            syncChatToForm('pass_app', '');
            const passAppIndex = chatSteps.findIndex(step => step.key === 'pass_app');
            if (passAppIndex !== -1 && chatStep < passAppIndex) {
                chatStep = passAppIndex;
            }
        }
    }
    // Nova tentativa de e-mail
    else if (currentKey === 'email_retry') {
        if (val.toLowerCase() === 'pular' || !val) {
            setTimeout(() => addMsg('É necessário informar um e-mail válido para usar o aplicativo.', 'bot', 'warn'), 250);
            return;
        }
        chatData['email'] = val;
        syncChatToForm('email', val);
    }
    // Demais campos
    else {
        const finalVal = (val.toLowerCase() === 'pular') ? '' : val;
        chatData[currentKey] = finalVal;
        syncChatToForm(currentKey, finalVal);
    }

    chatStep++;

    if (chatStep < chatSteps.length) {
        setTimeout(() => addMsg(chatSteps[chatStep].label, 'bot'), 400);
    } else {
        setTimeout(async () => {
            addMsg('Enviando cadastro...', 'bot');
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
            // Desabilita o formulário para evitar envios duplicados
            const form = document.getElementById('traditionalForm');
            if (form) {
                form.querySelectorAll('input, button').forEach(el => el.disabled = true);
                form.style.display = 'none';
                document.getElementById('success-screen').style.display = 'block';
            }

            if (origin === 'chat') {
                addMsg('Cadastro enviado com sucesso.', 'bot', 'ok');
                const chatInputGroup = document.getElementById('chatInputGroup');
                if (chatInputGroup) chatInputGroup.style.display = 'none';
            }
            return true;
        }

        alert('Não foi possível enviar o cadastro. Tente novamente.');
        return false;
    } catch (e) {
        console.error('Erro no envio:', e);
        alert('Falha na conexão com o servidor. Verifique sua internet e tente novamente.');
        return false;
    }
}

// Máscara de telefone: (00) 0000-0000 ou (00) 00000-0000
function formatarTelefone(value) {
    value = value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    return value;
}

// Máscara de CPF: 000.000.000-00
function formatarCPF(value) {
    value = value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return value;
}

// Máscara de RG: 00.000.000-X
function formatarRG(value) {
    value = value.replace(/[^0-9Xx]/g, '');
    value = value.replace(/(\d{2})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})([0-9Xx]{1})$/, '$1-$2');
    return value;
}

async function toggleVistStatus(id, currentStatus) {
    const newStatus = !currentStatus;

    try {
        const res = await fetch(`${API_BASE}/admin/passwords/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vist: newStatus })
        });

        if (res.ok) {
            loadAdminData();
        } else {
            alert('Não foi possível atualizar o status do registro.');
        }
    } catch (e) {
        console.error('Erro ao atualizar status:', e);
        alert('Falha na conexão com o servidor.');
    }
}

// Sincroniza as respostas do chat com os inputs do formulário
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

    if (mapKeysToInputIds[key]) {
        const inputEl = document.getElementById(mapKeysToInputIds[key]);
        if (inputEl) {
            inputEl.value = value;
            if (key === 'cliente') {
                document.getElementById('f_cliente_selected').value = value;
            }
        }
    }

    if (key === 'app') {
        const appCheckbox = document.getElementById('f_app');
        if (appCheckbox) {
            appCheckbox.checked = value;
            toggleAppInput(value);
        }
    }
}