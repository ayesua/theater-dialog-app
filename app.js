import { parseScript } from './script-parser.js';
import { SpeechEngine } from './speech-engine.js';

// Sample scripts in Spanish and English
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
        inputSubtitle: 'Pega el texto de la obra. StageCue detectará automáticamente los personajes y diálogos.',
        loadSample: 'Cargar ejemplo:',
        analyzeBtn: 'Analizar Guion y Detectar Personajes',
        chooseCharTitle: 'Elige tu Personaje',
        chooseCharSubtitle: 'Selecciona el personaje que vas a ensayar. La voz sintetizada (IA) leerá los demás personajes.',
        detectedChars: 'Personajes Detectados',
        voiceSettings: 'Configurar Voces de los Demás Personajes',
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
        allVoices: 'Todas las voces',
        femaleVoices: 'Femenina 👧 / Female',
        maleVoices: 'Masculina 👦 / Male'
    },
    'en-US': {
        changeScript: 'Change Script',
        inputTitle: 'Enter Your Play Script',
        inputSubtitle: 'Paste your theater script below. StageCue will automatically detect characters and dialog lines.',
        loadSample: 'Load sample:',
        analyzeBtn: 'Analyze Script & Detect Characters',
        chooseCharTitle: 'Choose Your Character',
        chooseCharSubtitle: 'Select the character you want to practice. The AI will read all other roles!',
        detectedChars: 'Detected Characters',
        voiceSettings: 'Voice Settings for Other Roles',
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
        allVoices: 'All Voices',
        femaleVoices: 'Female 👧',
        maleVoices: 'Male 👦'
    }
};

class StageCueApp {
    constructor() {
        this.speechEngine = new SpeechEngine();
        this.parsedData = { characters: [], lines: [] };
        this.selectedUserCharacter = null;
        this.voiceAssignments = {}; 
        this.currentLang = 'es-ES';

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

        this.scriptText = document.getElementById('scriptText');
        this.btnParseScript = document.getElementById('btnParseScript');
        this.btnResetScript = document.getElementById('btnResetScript');

        this.characterList = document.getElementById('characterList');
        this.voiceAssignmentList = document.getElementById('voiceAssignmentList');
        this.btnStartPlay = document.getElementById('btnStartPlay');
        this.btnBackToInput = document.getElementById('btnBackToInput');

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
            alert(this.currentLang.startsWith('es') ? '¡Por favor ingresa o pega el texto del guion!' : 'Please paste or enter script text first!');
            return;
        }

        this.parsedData = parseScript(text);

        if (this.parsedData.characters.length === 0) {
            alert(this.currentLang.startsWith('es') ? 'No se detectaron personajes. Asegúrate de iniciar cada línea con NOMBRE:' : 'No character dialogs detected! Make sure lines start with CHARACTER NAME:');
            return;
        }

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

        this.parsedData.characters.forEach(char => {
            const item = document.createElement('div');
            item.className = 'voice-item';

            let optionsHtml = `<option value="">${this.t('defaultVoice')}</option>`;
            voices.forEach(v => {
                const nameLower = v.name.toLowerCase();
                let genderTag = '';
                if (nameLower.includes('female') || nameLower.includes('helena') || nameLower.includes('sabina') || nameLower.includes('zira') || nameLower.includes('hilda') || nameLower.includes('daria') || nameLower.includes('monica') || nameLower.includes('paloma') || nameLower.includes('victoria') || nameLower.includes('laura') || nameLower.includes('samantha')) {
                    genderTag = ' 👧 (Femenina / Female)';
                } else if (nameLower.includes('male') || nameLower.includes('pablo') || nameLower.includes('raul') || nameLower.includes('jorge') || nameLower.includes('david') || nameLower.includes('mark') || nameLower.includes('george') || nameLower.includes('alonso')) {
                    genderTag = ' 👦 (Masculino / Male)';
                }
                optionsHtml += `<option value="${v.name}">${v.name}${genderTag}</option>`;
            });

            item.innerHTML = `
                <label>${this.currentLang.startsWith('es') ? 'Voz para' : 'Voice for'} ${char.name}</label>
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

        this.rehearsalActive = true;
        this.isPaused = false;
        this.currentLineIndex = 0;

        // 1 second pause before starting play
        setTimeout(() => {
            if (this.rehearsalActive && !this.isPaused) {
                this.processCurrentLine();
            }
        }, 1000);
    }

    renderTeleprompterLines() {
        this.scriptDisplay.innerHTML = '';
        this.parsedData.lines.forEach((lineObj, idx) => {
            const isUser = lineObj.character === this.selectedUserCharacter;
            const lineCard = document.createElement('div');
            lineCard.className = `line-card ${lineObj.type === 'direction' ? 'direction' : (isUser ? 'user-role' : 'computer-role')}`;
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

            this.scriptDisplay.appendChild(lineCard);
        });
    }

    processCurrentLine() {
        if (!this.rehearsalActive || this.isPaused) return;

        if (this.currentLineIndex >= this.parsedData.lines.length) {
            this.endRehearsal('setup');
            alert(this.currentLang.startsWith('es') ? '¡Fin de la escena! ¡Excelente ensayo!' : "End of scene reached! Great job rehearsing!");
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
                { voiceName, lang: this.currentLang },
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
        const lineObj = this.parsedData.lines[this.currentLineIndex];
        if (lineObj) {
            const firstWords = lineObj.text.split(' ').slice(0, 4).join(' ');
            alert(`${lineObj.character}: "${firstWords}..."`);
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
        this.showView(targetView);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new StageCueApp();
});
