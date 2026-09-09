/**
 * Speech Engine wrapper for Web Speech API (Synthesis & Recognition)
 * Supports language switching (Spanish / English) and voice configuration.
 */

export class SpeechEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.recognition = null;
        this.isListening = false;
        this.language = 'es-ES'; // Default language ('es-ES', 'en-US', etc.)
        this.initVoices();
        this.initRecognition();
    }

    setLanguage(langCode) {
        this.language = langCode;
        if (this.recognition) {
            this.recognition.lang = langCode;
        }
    }

    initVoices() {
        if (!this.synth) return;
        const load = () => {
            this.voices = this.synth.getVoices();
        };
        load();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = load;
        }
    }

    getVoices(filterLang = null) {
        if (!this.voices.length && this.synth) {
            this.voices = this.synth.getVoices();
        }
        if (filterLang) {
            const prefix = filterLang.split('-')[0].toLowerCase();
            const filtered = this.voices.filter(v => v.lang.toLowerCase().startsWith(prefix));
            return filtered.length > 0 ? filtered : this.voices;
        }
        return this.voices;
    }

    speak(text, voiceConfig = {}, onEnd, onError) {
        if (!this.synth) {
            if (onError) onError(new Error("Speech synthesis not supported"));
            return;
        }

        this.synth.cancel(); // Stop any ongoing speech

        // Remove parenthetical stage directions before speaking
        const printableText = text.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();

        const utterance = new SpeechSynthesisUtterance(printableText || text);
        utterance.rate = voiceConfig.rate || 1.0;
        utterance.pitch = voiceConfig.pitch || 1.0;
        utterance.lang = voiceConfig.lang || this.language;

        if (voiceConfig.voiceName) {
            const selectedVoice = this.voices.find(v => v.name === voiceConfig.voiceName);
            if (selectedVoice) utterance.voice = selectedVoice;
        } else {
            // Auto pick best matching voice for current language
            const prefix = utterance.lang.split('-')[0].toLowerCase();
            const matchingVoice = this.voices.find(v => v.lang.toLowerCase().startsWith(prefix));
            if (matchingVoice) utterance.voice = matchingVoice;
        }

        utterance.onend = () => {
            if (onEnd) onEnd();
        };

        utterance.onerror = (err) => {
            console.error("Speech synthesis error:", err);
            if (onError) onError(err);
        };

        this.synth.speak(utterance);
    }

    stopSpeaking() {
        if (this.synth) {
            this.synth.cancel();
        }
    }

    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition API is not supported in this browser.");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.language;
    }

    listen(onResult, onError, onEnd) {
        if (!this.recognition) {
            if (onError) onError(new Error("Speech Recognition not supported in this browser. Please use Chrome/Edge or manual controls."));
            return;
        }

        this.stopListening();
        this.recognition.lang = this.language;

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (onResult) {
                onResult({
                    interim: interimTranscript,
                    final: finalTranscript,
                    combined: (finalTranscript + ' ' + interimTranscript).trim()
                });
            }
        };

        this.recognition.onerror = (err) => {
            if (err.error !== 'no-speech' && onError) {
                onError(err);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (onEnd) onEnd();
        };

        try {
            this.recognition.start();
            this.isListening = true;
        } catch (e) {
            console.error("Error starting speech recognition:", e);
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Ignore stop errors if already stopped
            }
            this.isListening = false;
        }
    }

    /**
     * Compare user spoken text with target line text using fuzzy similarity
     */
    checkTextMatch(spoken, target, similarityThreshold = 0.50) {
        if (!spoken || !target) return false;

        const normalize = (str) => {
            return str
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents for easier matching
                .replace(/\([^)]*\)/g, '') // remove parentheticals
                .replace(/\[[^\]]*\]/g, '')
                .replace(/[^a-z0-9\s]/g, '') // remove punctuation
                .replace(/\s+/g, ' ')
                .trim();
        };

        const cleanSpoken = normalize(spoken);
        const cleanTarget = normalize(target);

        if (!cleanSpoken || !cleanTarget) return false;

        // Substring match check
        if (cleanTarget.includes(cleanSpoken) && cleanSpoken.length > Math.min(8, cleanTarget.length * 0.35)) {
            return true;
        }

        // Word overlap ratio (Jaccard similarity)
        const spokenWords = new Set(cleanSpoken.split(' '));
        const targetWords = cleanTarget.split(' ');
        let matchedCount = 0;

        for (const word of targetWords) {
            if (spokenWords.has(word)) {
                matchedCount++;
            }
        }

        const matchRatio = matchedCount / targetWords.length;
        return matchRatio >= similarityThreshold;
    }
}
