import { parseScript } from './script-parser.js';
import { SpeechEngine } from './speech-engine.js';

// Configure PDF.js worker
if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const SAMPLES = {
    donJuan: `DON JUAN: ¿No es verdad, ángel de amor, que en esta apartada orilla más pura la luna brilla y se respira mejor?
DOÑA INÉS: Calla, por Dios, ¡oh, Don Juan!, que no podré resistir mucho tiempo sin morir tan nunca visto tormento.
DON JUAN: ¡Ah! Cesen tus tormentos, Inés mía, pues a tus pies ves al altivo don Juan.
DOÑA INÉS: Don Juan, ten piedad de mí... ¡Me abraso en tu dulce voz!`,

    casaBernarda: `BERNARDA: ¡Silencio!
ADELA: ¡Aquí se acabaron las voces de presidio! ¡Esto hago yo con la vara de la dominadora!
MARTIRIO: ¡Adela!
ADELA: ¡En mí no manda nadie más que Pepe!
BERNARDA: ¡Cogedla! ¡Que la maten!`,

    romeo: `ROMEO: Lady, by yonder blessed moon I vow, That tips with silver all these fruit-tree tops...
JULIET: O, swear not by the moon, the inconstant moon, That monthly changes in her circled orb, Lest that thy love prove likewise variable.
ROMEO: What shall I swear by?
JULIET: Do not swear at all; Or, if thou wilt, swear by thy gracious self, Which is the god of my idolatry, And I'll believe thee.`,

    comedy: `ALEX: Did you remember to pack the map?
BAILEY: I thought you had the map!
ALEX: I explicitly handed it to you right before we left the cabin!
BAILEY: Oh, that paper? I used it to light the campfire...
ALEX: You burned our only map?!`
};

const I18N = {
    'es-ES': {
        changeScript: 'Cambiar Guion',
        inputTitle: 'Ingresa tu Guion Teatral',
        inputSubtitle: 'Pega el texto de la obra o sube un archivo (.pdf, .txt, .docx). StageCue detectará automáticamente los personajes.',
        uploadPrompt: 'Haz clic para subir un archivo',
        uploadOrDrag: 'o arrástralo aquí',
        loadSample: 'O carga un ejemplo:',
        analyzeBtn: 'Analizar Guion y Detectar Personajes',
        chooseCharTitle: 'Elige tu Personaje',
        chooseCharSubtitle: 'Selecciona el personaje que vas a ensayar. La voz sintetizada (IA) leerá los demás personajes.',
        detectedChars: 'Personajes Detectados',
        voiceSettings: 'Configurar Voces de los Demás Personajes',
        naturalVoiceHint: 'Selecciona voces con la etiqueta 🌟 (Natural / Neural) para obtener la mayor fluidez humana.',
        backBtn: 'Volver al Guion',
        startBtn: '¡Comenzar Ensayo!',
        practicingAs: 'Ensayando como:',
        pauseBtn: 'Pausar',
        resumeBtn: 'Reanudar',
        repeatBtn: 'Repetir Línea',
        hintBtn: 'Dar Pista',
        skipBtn: 'Saltar Línea',
        endBtn: 'Terminar',
        yourTurn: '¡Tu Turno! Di tu diálogo...',
        matched: '¡Correcto! Avanzando...',
        listening: 'Escuchando tu voz...',
        defaultVoice: 'Voz predeterminada del sistema',
        genderVoice: 'Filtro de Voz / Género:',
        modeNormal: 'Modo Lectura Guion',
        modeBlind: 'Modo Memoria / Ocultar Mi Línea',
        speedLabel: 'Velocidad Lectura IA:',
        savedScriptsTitle: 'Tus Guiones Guardados:'
    },
    'en-US': {
        changeScript: 'Change Script',
        inputTitle: 'Enter Your Play Script',
        inputSubtitle: 'Paste your script or upload a file (.pdf, .txt, .docx). StageCue will automatically detect characters.',
        uploadPrompt: 'Click to upload a file',
        uploadOrDrag: 'or drag and drop here',
        loadSample: 'Or load a sample:',
        analyzeBtn: 'Analyze Script & Detect Characters',
        chooseCharTitle: 'Choose Your Character',
        chooseCharSubtitle: 'Select the character you want to practice. The AI will read all other roles!',
        detectedChars: 'Detected Characters',
        voiceSettings: 'Voice Settings for Other Roles',
        naturalVoiceHint: 'Select voices tagged with 🌟 (Natural / Neural) for the most human-like fluency.',
        backBtn: 'Back to Script',
        startBtn: 'Start Rehearsal!',
        practicingAs: 'Practicing as:',
        pauseBtn: 'Pause',
        resumeBtn: 'Resume',
        repeatBtn: 'Repeat Line',
        hintBtn: 'Give Hint',
        skipBtn: 'Skip Line',
        endBtn: 'End',
        yourTurn: 'Your Turn! Speak your line...',
        matched: 'Matched! Good job!',
        listening: 'Listening for voice...',
        defaultVoice: 'Default System Voice',
        genderVoice: 'Voice Filter / Gender:',
        modeNormal: 'Normal Script Mode',
        modeBlind: 'Memory / Hide My Line Mode',
        speedLabel: 'AI Speech Speed:',
        savedScriptsTitle: 'Your Saved Scripts:'
    }
};

class StageCueApp {
    constructor() {
        this.speechEngine = new SpeechEngine();
        this.parsedData = { characters: [], lines: [] };
        this.selectedUserCharacter = null;
        this.voiceAssignments = {}; 
        this.currentLang = 'es-ES';
        this.isBlindMode = false;
        this.speechRate = 1.0;

        // Stats tracking
        this.userLinesCount = 0;
        this.userLinesCompleted = 0;
        this.hintsCount = 0;
        this.rehearsalStartTime = 0;

        // Rehearsal state
        this.currentLineIndex = -1;
        this.isPaused = false;
        this.rehearsalActive = false;

        this.initDOM();
        this.bindEvents();
        this.updateLanguage('es-ES');
    }

    initDOM() {
        this.appLanguage = document.getElementById('appLanguage');
        this.viewScriptInput = document.getElementById('viewScriptInput');
        this.viewSetup = document.getElementById('viewSetup');
        this.viewRehearsal = document.getElementById('viewRehearsal');
        this.headerActions = document.getElementById('headerActions');

        // Progress bar
        this.progressBarFill = document.getElementById('progressBarFill');
        this.progressText = document.getElementById('progressText');

        // Modal
        this.summaryModal = document.getElementById('summaryModal');
        this.statAccuracy = document.getElementById('statAccuracy');
        this.statLinesSpoken = document.getElementById('statLinesSpoken');
        this.statHintsUsed = document.getElementById('statHintsUsed');
        this.btnModalRestart = document.getElementById('btnModalRestart');
        this.btnModalBack = document.getElementById('btnModalBack');

        // Upload DOM
        this.fileInput = document.getElementById('fileInput');
        this.dropZone = document.getElementById('dropZone');
        this.fileStatus = document.getElementById('fileStatus');

        this.scriptText = document.getElementById('scriptText');
        this.btnParseScript = document.getElementById('btnParseScript');
        this.btnResetScript = document.getElementById('btnResetScript');

        this.characterList = document.getElementById('characterList');
        this.voiceAssignmentList = document.getElementById('voiceAssignmentList');
        this.btnStartPlay = document.getElementById('btnStartPlay');
        this.btnBackToInput = document.getElementById('btnBackToInput');

        // Saved scripts DOM
        this.savedScriptsContainer = document.getElementById('savedScriptsContainer');
        this.savedScriptsList = document.getElementById('savedScriptsList');
        this.btnClearSaved = document.getElementById('btnClearSaved');

        // Mode chips & sliders
        this.chipNormalMode = document.getElementById('chipNormalMode');
        this.chipBlindMode = document.getElementById('chipBlindMode');
        this.speechSpeed = document.getElementById('speechSpeed');
        this.speedVal = document.getElementById('speedVal');

        // Samples
        this.sampleDonJuan = document.getElementById('sampleDonJuan');
        this.sampleCasaBernarda = document.getElementById('sampleCasaBernarda');
        this.sampleRomeo = document.getElementById('sampleRomeo');
        this.sampleComedy = document.getElementById('sampleComedy');

        // Rehearsal Elements
        this.userRoleBadge = document.getElementById('userRoleBadge');
        this.turnIndicator = document.getElementById('turnIndicator');
        this.turnStatusText = document.getElementById('turnStatusText');
        this.transcriptLive = document.getElementById('transcriptLive');
        this.scriptDisplay = document.getElementById('scriptDisplay');
        this.teleprompter = document.getElementById('teleprompter');

        // Dock controls
        this.btnPlayPause = document.getElementById('btnPlayPause');
        this.btnRepeatLine = document.getElementById('btnRepeatLine');
        this.btnPromptHint = document.getElementById('btnPromptHint');
        this.btnSkipLine = document.getElementById('btnSkipLine');
        this.btnEndRehearsal = document.getElementById('btnEndRehearsal');
    }

    bindEvents() {
        this.appLanguage.addEventListener('change', (e) => {
            this.updateLanguage(e.target.value);
        });

        // File upload event listeners
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files[0]));
        
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                this.dropZone.classList.add('drag-over');
            });
        });
        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                this.dropZone.classList.remove('drag-over');
            });
        });
        this.dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        // Mode toggles
        this.chipNormalMode.addEventListener('click', () => {
            this.isBlindMode = false;
            this.chipNormalMode.classList.add('active');
            this.chipBlindMode.classList.remove('active');
        });
        this.chipBlindMode.addEventListener('click', () => {
            this.isBlindMode = true;
            this.chipBlindMode.classList.add('active');
            this.chipNormalMode.classList.remove('active');
        });

        // Speed slider
        this.speechSpeed.addEventListener('input', (e) => {
            this.speechRate = parseFloat(e.target.value);
            this.speedVal.textContent = `${this.speechRate.toFixed(1)}x`;
        });

        // Samples
        this.sampleDonJuan.addEventListener('click', () => {
            this.scriptText.value = SAMPLES.donJuan;
            this.appLanguage.value = 'es-ES';
            this.updateLanguage('es-ES');
        });
        this.sampleCasaBernarda.addEventListener('click', () => {
            this.scriptText.value = SAMPLES.casaBernarda;
            this.appLanguage.value = 'es-ES';
            this.updateLanguage('es-ES');
        });
        this.sampleRomeo.addEventListener('click', () => {
            this.scriptText.value = SAMPLES.romeo;
            this.appLanguage.value = 'en-US';
            this.updateLanguage('en-US');
        });
        this.sampleComedy.addEventListener('click', () => {
            this.scriptText.value = SAMPLES.comedy;
            this.appLanguage.value = 'en-US';
            this.updateLanguage('en-US');
        });

        this.btnParseScript.addEventListener('click', () => this.handleScriptParse());
        this.btnBackToInput.addEventListener('click', () => this.showView('input'));
        this.btnResetScript.addEventListener('click', () => this.endRehearsal('input'));

        this.btnStartPlay.addEventListener('click', () => this.startRehearsal());

        this.btnPlayPause.addEventListener('click', () => this.togglePause());
        this.btnRepeatLine.addEventListener('click', () => this.repeatCurrentLine());
        this.btnPromptHint.addEventListener('click', () => this.giveHint());
        this.btnSkipLine.addEventListener('click', () => this.advanceLine());
        this.btnEndRehearsal.addEventListener('click', () => this.endRehearsal());

        // Clear saved scripts
        if (this.btnClearSaved) {
            this.btnClearSaved.addEventListener('click', () => {
                if (confirm(this.currentLang.startsWith('es') ? '¿Eliminar todos los guiones guardados?' : 'Clear all saved scripts?')) {
                    localStorage.removeItem('stagecue_saved_scripts');
                    this.renderSavedScripts();
                }
            });
        }

        // Render saved scripts on launch
        this.renderSavedScripts();
    }

    getSavedScripts() {
        try {
            return JSON.parse(localStorage.getItem('stagecue_saved_scripts') || '[]');
        } catch (e) {
            return [];
        }
    }

    saveScriptToStorage(name, text, lineCount) {
        if (!text || !text.trim()) return;
        let list = this.getSavedScripts();

        // Check if identical already exists
        list = list.filter(item => item.text !== text);
        
        list.unshift({
            name: name || (text.slice(0, 24).trim() + '...'),
            text: text,
            lineCount: lineCount || text.split('\n').length,
            savedAt: new Date().toLocaleDateString()
        });

        // Cap at 10 saved scripts
        list = list.slice(0, 10);
        localStorage.setItem('stagecue_saved_scripts', JSON.stringify(list));
        this.renderSavedScripts();
    }

    renderSavedScripts() {
        if (!this.savedScriptsContainer || !this.savedScriptsList) return;
        const list = this.getSavedScripts();

        if (list.length === 0) {
            this.savedScriptsContainer.style.display = 'none';
            return;
        }

        this.savedScriptsContainer.style.display = 'block';
        this.savedScriptsList.innerHTML = '';

        list.forEach((item, index) => {
            const chip = document.createElement('div');
            chip.className = 'saved-script-chip';
            chip.innerHTML = `
                <i class="fa-solid fa-scroll"></i>
                <span class="chip-name" title="${item.name}">${item.name}</span>
                <span class="chip-lines">${item.lineCount} l.</span>
            `;
            chip.addEventListener('click', () => {
                this.scriptText.value = item.text;
                // Visual feedback
                document.querySelectorAll('.saved-script-chip').forEach(c => c.style.borderColor = 'var(--card-border)');
                chip.style.borderColor = 'var(--accent)';
            });
            this.savedScriptsList.appendChild(chip);
        });
    }

    async handleFileUpload(file) {
        if (!file) return;

        this.fileStatus.style.display = 'block';
        this.fileStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Reading ${file.name}...`;

        try {
            let extractedText = '';
            const extension = file.name.split('.').pop().toLowerCase();

            if (extension === 'txt') {
                extractedText = await file.text();
            } else if (extension === 'pdf') {
                extractedText = await this.readPdfFile(file);
            } else if (extension === 'docx') {
                // Read text stream from docx/plain
                extractedText = await file.text();
            } else {
                throw new Error("Formato de archivo no soportado. Usa PDF, TXT o DOCX.");
            }

            if (extractedText && extractedText.trim()) {
                this.scriptText.value = extractedText;
                this.fileStatus.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--success)"></i> ${file.name} cargado correctamente!`;
                // Save to local storage
                this.saveScriptToStorage(file.name, extractedText, extractedText.split('\n').length);
            } else {
                throw new Error("No se pudo extraer texto del archivo.");
            }
        } catch (err) {
            console.error("File upload error:", err);
            this.fileStatus.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color:var(--danger)"></i> Error: ${err.message}`;
        }
    }

    async readPdfFile(file) {
        if (!window.pdfjsLib) {
            throw new Error("PDF parser loading... intenta de nuevo en unos segundos.");
        }
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            
            // Group items into lines based on their vertical Y position
            const items = content.items;
            if (!items || items.length === 0) continue;

            // Sort items by Y descending (top to bottom), then X ascending (left to right)
            items.sort((a, b) => {
                const yA = a.transform ? a.transform[5] : 0;
                const yB = b.transform ? b.transform[5] : 0;
                if (Math.abs(yA - yB) > 4) {
                    return yB - yA; // top to bottom
                }
                const xA = a.transform ? a.transform[4] : 0;
                const xB = b.transform ? b.transform[4] : 0;
                return xA - xB; // left to right
            });

            let pageLines = [];
            let currentLine = '';
            let lastY = null;

            for (const item of items) {
                const y = item.transform ? item.transform[5] : 0;
                if (lastY === null || Math.abs(y - lastY) <= 4) {
                    currentLine += (currentLine ? ' ' : '') + item.str;
                } else {
                    if (currentLine.trim()) {
                        pageLines.push(currentLine.trim());
                    }
                    currentLine = item.str;
                }
                lastY = y;
            }
            if (currentLine.trim()) {
                pageLines.push(currentLine.trim());
            }

            fullText += pageLines.join('\n') + '\n\n';
        }
        return fullText;
    }

    updateLanguage(langCode) {
        this.currentLang = langCode;
        this.speechEngine.setLanguage(langCode);

        const dict = I18N[langCode] || I18N['es-ES'];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.textContent = dict[key];
            }
        });

        if (this.parsedData.characters.length > 0) {
            this.renderVoiceAssignments();
        }
    }

    t(key) {
        return (I18N[this.currentLang] && I18N[this.currentLang][key]) || I18N['es-ES'][key] || key;
    }

    showView(viewName) {
        this.viewScriptInput.classList.remove('active');
        this.viewSetup.classList.remove('active');
        this.viewRehearsal.classList.remove('active');

        if (viewName === 'input') {
            this.viewScriptInput.classList.add('active');
            this.headerActions.style.display = 'none';
        } else if (viewName === 'setup') {
            this.viewSetup.classList.add('active');
            this.headerActions.style.display = 'block';
        } else if (viewName === 'rehearsal') {
            this.viewRehearsal.classList.add('active');
            this.headerActions.style.display = 'block';
        }
    }

    handleScriptParse() {
        const text = this.scriptText.value;
        if (!text || !text.trim()) {
            alert(this.currentLang.startsWith('es') ? '¡Por favor ingresa o sube el texto del guion!' : 'Please paste or upload script text first!');
            return;
        }

        this.parsedData = parseScript(text);

        if (this.parsedData.characters.length === 0) {
            alert(this.currentLang.startsWith('es') ? 'No se detectaron personajes. Asegúrate de iniciar cada línea con NOMBRE:' : 'No character dialogs detected! Make sure lines start with CHARACTER NAME:');
            return;
        }

        // Automatically save to local history
        const firstLine = text.split('\n')[0].replace(/[:.-].*$/, '').trim();
        const scriptTitle = firstLine ? `Guion (${firstLine})` : `Guion ${new Date().toLocaleTimeString()}`;
        this.saveScriptToStorage(scriptTitle, text, this.parsedData.lines.length);

        this.renderSetupView();
        this.showView('setup');
    }

    renderSetupView() {
        this.characterList.innerHTML = '';
        this.selectedUserCharacter = null;
        this.btnStartPlay.disabled = true;

        this.parsedData.characters.forEach(char => {
            const card = document.createElement('div');
            card.className = 'character-card';
            card.innerHTML = `
                <span class="name">${char.name}</span>
                <span class="count">${char.lineCount} ${this.currentLang.startsWith('es') ? 'líneas' : 'lines'}</span>
            `;
            card.addEventListener('click', () => {
                document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedUserCharacter = char.name;
                this.btnStartPlay.disabled = false;
            });
            this.characterList.appendChild(card);
        });

        this.renderVoiceAssignments();
    }

    renderVoiceAssignments() {
        this.voiceAssignmentList.innerHTML = '';
        const voices = this.speechEngine.getVoices(this.currentLang);

        const femaleNamesList = ['lydia', 'bárbara', 'barbara', 'delia', 'inés', 'ines', 'juliet', 'julieta', 'adela', 'martirio', 'bernarba', 'bernarda', 'maxine', 'señorita argentina', 'senorita argentina', 'juno', 'niña exploradora', 'nina exploradora', 'vecina', 'chica de la tostadora'];
        const maleNamesList = ['beetlejuice', 'adam', 'charles', 'otho', 'maxi dean', 'maxie dean', 'romeo', 'don juan', 'sacerdote', 'abogado', 'pizzero', 'repartidor', 'agente del censo', 'mudancero', 'infiel', 'jinete'];

        this.parsedData.characters.forEach(char => {
            const item = document.createElement('div');
            item.className = 'voice-item';

            const charLower = char.name.toLowerCase();
            const isCharacterFemale = femaleNamesList.some(fn => charLower.includes(fn));
            const isCharacterMale = maleNamesList.some(mn => charLower.includes(mn));

            // Find best default voice: prioritize Natural + gender match
            let recommendedVoiceName = '';
            for (const v of voices) {
                const vLower = v.name.toLowerCase();
                const isVoiceNatural = /natural|neural|online|google|microsoft/i.test(v.name);
                const isVoiceFemale = ['female', 'daria', 'paloma', 'catalina', 'esmeralda', 'salome', 'jimena', 'marta', 'sofia', 'carmen', 'lucia', 'elena', 'camila', 'lorena', 'renata', 'silvia', 'yolanda', 'helena', 'sabina', 'zira', 'hilda', 'monica', 'victoria', 'laura', 'samantha', 'jenny', 'aria', 'ana'].some(kw => vLower.includes(kw));
                const isVoiceMale = ['male', 'pablo', 'raul', 'jorge', 'david', 'mark', 'george', 'alonso', 'alvaro', 'mateo', 'tomas', 'nicolas', 'gonzalo', 'guillermo', 'justin', 'guy', 'ryan', 'stefan'].some(kw => vLower.includes(kw));

                if (isCharacterFemale && isVoiceFemale && isVoiceNatural) {
                    recommendedVoiceName = v.name;
                    break;
                } else if (isCharacterMale && isVoiceMale && isVoiceNatural) {
                    recommendedVoiceName = v.name;
                    break;
                }
            }

            // Fallback to first natural voice if no strict gender match
            if (!recommendedVoiceName) {
                const firstNat = voices.find(v => /natural|neural|online|google|microsoft/i.test(v.name));
                if (firstNat) recommendedVoiceName = firstNat.name;
            }

            // Save default selection if not already chosen
            if (!this.voiceAssignments[char.name]) {
                this.voiceAssignments[char.name] = recommendedVoiceName || '';
            }

            let optionsHtml = `<option value="">${this.t('defaultVoice')}</option>`;
            voices.forEach(v => {
                const nameLower = v.name.toLowerCase();
                let genderTag = '';
                const femaleKeywords = ['female', 'helena', 'sabina', 'zira', 'hilda', 'daria', 'monica', 'paloma', 'victoria', 'laura', 'samantha', 'mia', 'esmeralda', 'salome', 'jimena', 'marta', 'sofia', 'carmen', 'lucia', 'elena', 'camila', 'lorena', 'renata', 'silvia', 'yolanda', 'catalina', 'jenny', 'aria', 'ana'];
                const maleKeywords = ['male', 'pablo', 'raul', 'jorge', 'david', 'mark', 'george', 'alonso', 'alvaro', 'mateo', 'tomas', 'nicolas', 'gonzalo', 'guillermo', 'justin', 'guy', 'ryan', 'stefan'];

                if (femaleKeywords.some(kw => nameLower.includes(kw))) {
                    genderTag = ' 👧 (Femenina / Female)';
                } else if (maleKeywords.some(kw => nameLower.includes(kw))) {
                    genderTag = ' 👦 (Masculino / Male)';
                }

                let naturalTag = '';
                if (/natural|neural|online|google|microsoft/i.test(v.name)) {
                    naturalTag = ' 🌟 [Fluida / Natural]';
                }

                const isSelected = this.voiceAssignments[char.name] === v.name ? 'selected' : '';
                optionsHtml += `<option value="${v.name}" ${isSelected}>${v.name}${naturalTag}${genderTag}</option>`;
            });

            const charRoleTag = isCharacterFemale ? ' 👧' : (isCharacterMale ? ' 👦' : '');

            item.innerHTML = `
                <label>${this.currentLang.startsWith('es') ? 'Voz para' : 'Voice for'} <strong>${char.name}${charRoleTag}</strong></label>
                <select data-char="${char.name}">
                    ${optionsHtml}
                </select>
            `;

            const selectEl = item.querySelector('select');
            selectEl.addEventListener('change', (e) => {
                this.voiceAssignments[char.name] = e.target.value;
            });

            this.voiceAssignmentList.appendChild(item);
        });
    }

    startRehearsal() {
        if (!this.selectedUserCharacter) return;

        this.userRoleBadge.textContent = this.selectedUserCharacter;
        this.renderTeleprompterLines();
        this.showView('rehearsal');

        // Reset stats
        this.userLinesCount = this.parsedData.lines.filter(l => l.character === this.selectedUserCharacter).length;
        this.userLinesCompleted = 0;
        this.hintsCount = 0;
        this.rehearsalStartTime = Date.now();

        this.rehearsalActive = true;
        this.isPaused = false;
        this.currentLineIndex = 0;
        this.updateProgressBar();

        setTimeout(() => {
            if (this.rehearsalActive && !this.isPaused) {
                this.processCurrentLine();
            }
        }, 1000);
    }

    updateProgressBar() {
        if (!this.parsedData.lines.length) return;
        const total = this.parsedData.lines.length;
        const current = Math.min(this.currentLineIndex + 1, total);
        const percent = Math.round((current / total) * 100);

        if (this.progressBarFill) {
            this.progressBarFill.style.width = `${percent}%`;
        }
        if (this.progressText) {
            this.progressText.textContent = `${this.currentLang.startsWith('es') ? 'Línea' : 'Line'} ${current} / ${total} (${percent}%)`;
        }
    }

    renderTeleprompterLines() {
        this.scriptDisplay.innerHTML = '';
        this.parsedData.lines.forEach((lineObj, idx) => {
            const isUser = lineObj.character === this.selectedUserCharacter;
            const lineCard = document.createElement('div');
            const blindClass = (isUser && this.isBlindMode) ? 'blind-mode' : '';
            lineCard.className = `line-card ${lineObj.type === 'direction' ? 'direction' : (isUser ? 'user-role' : 'computer-role')} ${blindClass}`;
            lineCard.id = `line-${idx}`;

            if (lineObj.type === 'direction') {
                lineCard.innerHTML = `<div class="line-body">${lineObj.text}</div>`;
            } else {
                lineCard.innerHTML = `
                    <div class="line-header">
                        <span class="char-name">${lineObj.character} ${isUser ? '(TÚ / YOU)' : ''}</span>
                    </div>
                    <div class="line-body">${lineObj.text}</div>
                `;
            }

            lineCard.addEventListener('click', () => {
                if (lineCard.classList.contains('blind-mode')) {
                    lineCard.classList.toggle('revealed');
                }
            });

            this.scriptDisplay.appendChild(lineCard);
        });
    }

    processCurrentLine() {
        if (!this.rehearsalActive || this.isPaused) return;

        this.updateProgressBar();

        if (this.currentLineIndex >= this.parsedData.lines.length) {
            this.showSummaryModal();
            return;
        }

        const lineObj = this.parsedData.lines[this.currentLineIndex];
        this.highlightLine(this.currentLineIndex);

        if (lineObj.type === 'direction') {
            this.setTurnStatus('direction', this.currentLang.startsWith('es') ? 'Acotación de escena' : 'Stage Direction');
            setTimeout(() => {
                if (this.rehearsalActive && !this.isPaused) {
                    this.advanceLineWithDelay();
                }
            }, 2000);
            return;
        }

        const isUserTurn = lineObj.character === this.selectedUserCharacter;

        if (isUserTurn) {
            this.speechEngine.stopSpeaking();
            this.setTurnStatus('listening', this.t('yourTurn'));
            this.startListeningForUser(lineObj.text);
        } else {
            this.speechEngine.stopListening();
            this.setTurnStatus('speaking', `${lineObj.character}...`);
            
            const voiceName = this.voiceAssignments[lineObj.character];
            this.speechEngine.speak(
                lineObj.text,
                { voiceName, lang: this.currentLang, rate: this.speechRate },
                () => {
                    if (this.rehearsalActive && !this.isPaused) {
                        this.advanceLineWithDelay();
                    }
                },
                (err) => {
                    console.error("TTS error, auto advancing:", err);
                    if (this.rehearsalActive && !this.isPaused) {
                        this.advanceLineWithDelay();
                    }
                }
            );
        }
    }

    startListeningForUser(targetText) {
        this.transcriptLive.textContent = this.t('listening');
        
        this.speechEngine.listen(
            (result) => {
                this.transcriptLive.textContent = `"${result.combined}"`;
                
                if (this.speechEngine.checkTextMatch(result.combined, targetText)) {
                    this.userLinesCompleted++;
                    this.speechEngine.stopListening();
                    this.setTurnStatus('listening', this.t('matched'));
                    this.advanceLineWithDelay();
                }
            },
            (error) => {
                console.warn("Speech recognition notice:", error);
            }
        );
    }

    highlightLine(index) {
        document.querySelectorAll('.line-card').forEach((card, idx) => {
            if (idx === index) {
                card.classList.add('active');
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                card.classList.remove('active');
            }
        });
    }

    setTurnStatus(type, text) {
        this.turnIndicator.className = `turn-indicator ${type}`;
        this.turnStatusText.textContent = text;
    }

    advanceLineWithDelay(delayMs = 1200) {
        setTimeout(() => {
            if (this.rehearsalActive && !this.isPaused) {
                this.currentLineIndex++;
                this.processCurrentLine();
            }
        }, delayMs);
    }

    advanceLine() {
        this.currentLineIndex++;
        this.processCurrentLine();
    }

    repeatCurrentLine() {
        this.processCurrentLine();
    }

    giveHint() {
        if (!this.rehearsalActive) return;
        this.hintsCount++;
        const lineObj = this.parsedData.lines[this.currentLineIndex];
        if (lineObj) {
            const firstWords = lineObj.text.split(' ').slice(0, 4).join(' ');
            alert(`${lineObj.character}: "${firstWords}..."`);
        }
    }

    showSummaryModal() {
        this.rehearsalActive = false;
        this.speechEngine.stopSpeaking();
        this.speechEngine.stopListening();

        const totalUser = Math.max(1, this.userLinesCount);
        const accuracy = Math.round(Math.max(0, ((this.userLinesCompleted - (this.hintsCount * 0.5)) / totalUser) * 100));

        if (this.statAccuracy) this.statAccuracy.textContent = `${Math.min(100, Math.max(10, accuracy))}%`;
        if (this.statLinesSpoken) this.statLinesSpoken.textContent = `${this.userLinesCompleted} / ${this.userLinesCount}`;
        if (this.statHintsUsed) this.statHintsUsed.textContent = `${this.hintsCount}`;

        if (this.summaryModal) {
            this.summaryModal.style.display = 'flex';
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const icon = this.btnPlayPause.querySelector('i');
        const span = this.btnPlayPause.querySelector('span');

        if (this.isPaused) {
            this.speechEngine.stopSpeaking();
            this.speechEngine.stopListening();
            icon.className = 'fa-solid fa-play';
            span.textContent = this.t('resumeBtn');
            this.setTurnStatus('paused', 'Pausado / Paused');
        } else {
            icon.className = 'fa-solid fa-pause';
            span.textContent = this.t('pauseBtn');
            this.processCurrentLine();
        }
    }

    endRehearsal(targetView = 'setup') {
        this.rehearsalActive = false;
        this.speechEngine.stopSpeaking();
        this.speechEngine.stopListening();
        if (this.summaryModal) this.summaryModal.style.display = 'none';
        this.showView(targetView);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const app = new StageCueApp();

    // Modal button listeners
    if (app.btnModalRestart) {
        app.btnModalRestart.addEventListener('click', () => {
            if (app.summaryModal) app.summaryModal.style.display = 'none';
            app.startRehearsal();
        });
    }
    if (app.btnModalBack) {
        app.btnModalBack.addEventListener('click', () => {
            if (app.summaryModal) app.summaryModal.style.display = 'none';
            app.endRehearsal('setup');
        });
    }
});
