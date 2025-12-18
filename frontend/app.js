const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileElem');
const fileNameDisplay = document.getElementById('file-name-display');
const renderBtn = document.getElementById('render-btn');
const consoleLogs = document.getElementById('console-logs');
const statusIndicator = document.getElementById('status-indicator');
const videoWrapper = document.getElementById('video-wrapper');
const videoPlayer = document.getElementById('result-video');
const imageViewer = document.getElementById('result-image');
const codeEditor = document.getElementById('code-editor');

// Tabs
const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');
let activeTab = 'upload';

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        // Add active to current
        tab.classList.add('active');
        activeTab = tab.dataset.tab;
        document.getElementById(`tab-${activeTab}`).classList.add('active');
    });
});

let selectedFile = null;
let socket = null;

// ==========================================
// 1. DRAG & DROP HANDLERS
// ==========================================
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
});

dropArea.addEventListener('drop', handleDrop, false);
dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.py')) {
            selectedFile = file;
            fileNameDisplay.textContent = file.name;
            fileNameDisplay.classList.remove('hidden');
            logToConsole(`${t('file_selected')}${file.name}`, 'info');
        } else {
            logToConsole(t('error_file'), 'error');
        }
    }
}

// ==========================================
// 2. I18N & DYNAMIC OPTIONS
// ==========================================
const verticalCheck = document.getElementById('vertical-check');
const qualitySelect = document.getElementById('quality-select');
const langSelect = document.getElementById('lang-select');

// Translations
const translations = {
    es: {
        input_label: "ENTRADA",
        tab_file: "Archivo",
        tab_code: "Código",
        drag_drop: "Arrastra tu script .py aquí",
        settings_label: "CONFIGURACIÓN",
        vertical_option: "Vertical (9:16) - Shorts/TikTok",
        preview_option: "Preview Automática",
        transparent_option: "Fondo Transparente",
        render_btn: "RENDERIZAR",
        rendering_status: "Procesando...",
        preview_title: "VISTA PREVIA",
        preview_placeholder: "El resultado aparecerá aquí",
        terminal_title: "TERMINAL DE SALIDA",

        // Dynamic
        file_selected: "Archivo seleccionado: ",
        error_file: "Error: Solo se permiten archivos .py",
        error_no_file: "Por favor selecciona un archivo .py primero.",
        error_empty_editor: "El editor de código está vacío.",
        preparing: "Preparando renderizado...",
        mode_file: "Modo: Archivo",
        mode_editor: "Modo: Editor de Código",
        render_success: "Renderizado completado con éxito!",
        error_server: "Error del servidor: ",
        error_network: "Error de red: ",
        connected: "Conectado al servidor de logs.",

        // Quality
        low: "Baja",
        medium: "Media",
        high: "Alta",
        uhd: "4K"
    },
    en: {
        input_label: "INPUT",
        tab_file: "File",
        tab_code: "Code",
        drag_drop: "Drag & drop your .py script here",
        settings_label: "SETTINGS",
        vertical_option: "Vertical (9:16) - Shorts/TikTok",
        preview_option: "Auto Preview",
        transparent_option: "Transparent Background",
        render_btn: "RENDER",
        rendering_status: "Processing...",
        preview_title: "PREVIEW",
        preview_placeholder: "Result will appear here",
        terminal_title: "OUTPUT TERMINAL",

        file_selected: "Selected file: ",
        error_file: "Error: Only .py files allowed",
        error_no_file: "Please select a .py file first.",
        error_empty_editor: "Code editor is empty.",
        preparing: "Preparing render...",
        mode_file: "Mode: File",
        mode_editor: "Mode: Code Editor",
        render_success: "Render completed successfully!",
        error_server: "Server Error: ",
        error_network: "Network Error: ",
        connected: "Connected to log server.",

        low: "Low",
        medium: "Medium",
        high: "High",
        uhd: "4K"
    },
    pt: {
        input_label: "ENTRADA",
        tab_file: "Arquivo",
        tab_code: "Código",
        drag_drop: "Arraste seu script .py aqui",
        settings_label: "CONFIGURAÇÃO",
        vertical_option: "Vertical (9:16) - Shorts/TikTok",
        preview_option: "Pré-visualização Auto",
        transparent_option: "Fundo Transparente",
        render_btn: "RENDERIZAR",
        rendering_status: "Processando...",
        preview_title: "PRÉ-VISUALIZAÇÃO",
        preview_placeholder: "O resultado aparecerá aqui",
        terminal_title: "TERMINAL DE SAÍDA",

        file_selected: "Arquivo selecionado: ",
        error_file: "Erro: Apenas arquivos .py permitidos",
        error_no_file: "Por favor selecione um arquivo .py primeiro.",
        error_empty_editor: "O editor de código está vazio.",
        preparing: "Preparando renderização...",
        mode_file: "Modo: Arquivo",
        mode_editor: "Modo: Editor de Código",
        render_success: "Renderização concluída com sucesso!",
        error_server: "Erro do servidor: ",
        error_network: "Erro de rede: ",
        connected: "Conectado ao servidor de logs.",

        low: "Baixa",
        medium: "Média",
        high: "Alta",
        uhd: "4K"
    }
};

let currentLang = 'es';

function setLanguage(lang) {
    if (!translations[lang]) lang = 'es';
    currentLang = lang;

    // Update Static Elements
    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.dataset.i18n;
        if (translations[lang][key]) {
            elem.textContent = translations[lang][key];
        }
    });

    // Update Placeholder
    const editor = document.getElementById('code-editor');
    if (editor && lang === 'en') editor.placeholder = "from manim import * ...";

    // Update Dropdown Options
    updateQualityOptions();
}

// Auto-detect Language
const browserLang = navigator.language.split('-')[0];
if (['es', 'en', 'pt'].includes(browserLang)) {
    setLanguage(browserLang);
    langSelect.value = browserLang;
} else {
    setLanguage('es'); // Default
}

langSelect.addEventListener('change', (e) => setLanguage(e.target.value));

verticalCheck.addEventListener('change', updateQualityOptions);

function updateQualityOptions() {
    const t = translations[currentLang];
    const isVertical = verticalCheck.checked;
    const currentVal = qualitySelect.value;

    const landscapeOptions = [
        { value: '-ql', text: `${t.low} (480p, 15fps)` },
        { value: '-qm', text: `${t.medium} (720p, 30fps)` },
        { value: '-qh', text: `${t.high} (1080p, 60fps)` },
        { value: '-qk', text: `${t.uhd} (2160p, 60fps)` }
    ];

    const verticalOptions = [
        { value: '-ql', text: `${t.low} (480x854, 15fps)` },
        { value: '-qm', text: `${t.medium} (720x1280, 30fps)` },
        { value: '-qh', text: `${t.high} (1080x1920, 60fps)` },
        { value: '-qk', text: `${t.uhd} (2160x3840, 60fps)` }
    ];

    const options = isVertical ? verticalOptions : landscapeOptions;

    qualitySelect.innerHTML = '';
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        // Keep selection if possible, else default to -qm
        if (opt.value === currentVal) option.selected = true;
        qualitySelect.appendChild(option);
    });
}
// Initial call
updateQualityOptions();

// Helper to get translated string
function t(key) {
    return translations[currentLang][key] || key;
}

// ==========================================
// 3. WEBSOCKET LOGS
// ==========================================
let reconnectTimer;
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/logs`;

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        logToConsole(t('connected'), "system");
    };

    socket.onmessage = (event) => {
        logToConsole(event.data);
    };

    socket.onclose = () => {
        // Retry logic to prevent scary messages on refresh/restart
        setTimeout(connectWebSocket, 3000);
    };

    socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
    };
}

// ==========================================
// 4. MAIN RENDER LOGIC
// ==========================================
renderBtn.addEventListener('click', async () => {
    if (renderBtn.disabled) return;
    const isFileMode = activeTab === 'upload';

    // Validation
    if (isFileMode && !selectedFile) {
        logToConsole(t('error_no_file'), "error");
        return;
    }
    if (!isFileMode && !codeEditor.value.trim()) {
        logToConsole(t('error_empty_editor'), "error");
        return;
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        connectWebSocket();
    }

    // UI Updates
    renderBtn.disabled = true;
    statusIndicator.classList.remove('hidden');
    videoPlayer.classList.add('hidden');
    imageViewer.classList.add('hidden');
    videoWrapper.querySelector('.placeholder-text').classList.remove('hidden');

    // Do NOT clear logs, allowing history to stack
    // consoleLogs.innerHTML = ''; 

    flushCurrentLine(); // Ensure we start on a new block

    // Add a visual separator
    const separator = document.createElement('div');
    separator.style.borderTop = '1px dashed #333';
    separator.style.margin = '10px 0';
    consoleLogs.appendChild(separator);

    logToConsole(t('preparing'), "system");

    const formData = new FormData();

    if (isFileMode) {
        formData.append('file', selectedFile);
        logToConsole(`${t('mode_file')} (${selectedFile.name})`, 'info');
    } else {
        const blob = new Blob([codeEditor.value], { type: "text/x-python" });
        formData.append('file', blob, "editor_script.py");
        logToConsole(t('mode_editor'), 'info');
    }

    formData.append('quality', document.getElementById('quality-select').value);
    formData.append('preview', document.getElementById('preview-check').checked);
    formData.append('transparent', document.getElementById('transparent-check').checked);
    formData.append('vertical', document.getElementById('vertical-check').checked);

    try {
        const response = await fetch('/render', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            logToConsole(t('render_success'), "success");
            if (result.file_url) {
                showMedia(result.file_url, result.type);
            }
        } else {
            logToConsole(`${t('error_server')}${result.detail || 'Desconocido'}`, 'error');
        }

    } catch (error) {
        logToConsole(`${t('error_network')}${error.message}`, 'error');
    } finally {
        renderBtn.disabled = false;
        statusIndicator.classList.add('hidden');
    }
});

// ==========================================
// 5. UTILS
// ==========================================
// ==========================================
// 5. UTILS (Terminal Emulator Logic)
// ==========================================
// ==========================================
// 5. UTILS (Terminal Emulator Logic)
// ==========================================
let currentLineElement = null;
let overwritePending = false;

function logToConsole(message, type = '') {
    // If it's a system message or error, just print it as a block
    if (type === 'system' || type === 'success' || type === 'error' || type === 'info') {
        flushCurrentLine();
        const div = document.createElement('div');
        div.className = `log-line ${type}`;
        div.textContent = `> ${message}`;
        consoleLogs.appendChild(div);
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
        return;
    }

    let chars = message.split('');

    chars.forEach(char => {
        if (char === '\n') {
            overwritePending = false;
            flushCurrentLine();
        } else if (char === '\r') {
            overwritePending = true;
        } else {
            if (!currentLineElement) {
                currentLineElement = document.createElement('div');
                currentLineElement.className = 'log-line';
                consoleLogs.appendChild(currentLineElement);
            }

            if (overwritePending) {
                currentLineElement.textContent = '';
                overwritePending = false;
            }

            currentLineElement.textContent += char;
        }
    });

    consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

function flushCurrentLine() {
    currentLineElement = null;
    overwritePending = false;
}

function showMedia(url, type) {
    const timestamp = new Date().getTime();
    const cleanUrl = `${url}?t=${timestamp}`;

    videoWrapper.querySelector('.placeholder-text').classList.add('hidden');

    if (type === 'video') {
        videoPlayer.src = cleanUrl;
        videoPlayer.classList.remove('hidden');
        imageViewer.classList.add('hidden');
        videoPlayer.load();
        videoPlayer.play();
    } else {
        imageViewer.src = cleanUrl;
        imageViewer.classList.remove('hidden');
        videoPlayer.classList.add('hidden');
        videoPlayer.pause();
    }
}

window.addEventListener('load', connectWebSocket);
