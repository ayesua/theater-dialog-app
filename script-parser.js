/**
 * Parses script text into structured lines and extracts detected characters.
 * Handles single lines, centered character headings, parenthetical directions,
 * lyrics in ALL-CAPS, and song/scene title banners.
 */
export function parseScript(rawText) {
    if (!rawText || !rawText.trim()) {
        return { characters: [], lines: [] };
    }

    const rawLines = rawText.split(/\r?\n/);
    const parsedLines = [];
    const characterMap = new Map(); // name -> count

    // Pattern 1: Inline dialog -> CHARACTER: Dialog text OR CHARACTER - Dialog text
    const inlinePattern = /^\s*([A-ZÁÉÍÓÚÑ0-9\s._'-]{2,30})\s*(?:\([^)]*\))?\s*[:.-]\s*(.+)$/i;
    
    // Pattern 2: Standalone character name on its own line (e.g. BEETLEJUICE, LYDIA, BÁRBARA, ADAM Y BÁRBARA, DELIA/OTHO)
    const standaloneCharPattern = /^\s*([A-ZÁÉÍÓÚÑ0-9\s._'\/-]{2,35})\s*(?:\([^)]*\))?\s*$/;

    let currentCharacter = null;

    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim();
        if (!line) continue;

        // Clean page headers/footers like "Beetlejuice México 1" or "Beetlejuice México 27"
        if (/^Beetlejuice\s+M[eé]xico\s+\d+$/i.test(line) || /^\d+$/.test(line)) {
            continue;
        }

        // Clean scene and act headers, song titles like ACTO I, ESCENA 2, "PRÓLOGO: INVISIBLE", COSAS SOBRE MUERTE, FIN DEL PRIMER ACTO
        if (/^(ACTO\s+[IVXLCDM\d]+|ESCENA\s+\d+|FIN\s+DEL\s+[A-Z\s]+)/i.test(line)) {
            parsedLines.push({
                id: parsedLines.length,
                type: 'direction',
                character: 'STAGE DIRECTION / ACOTACIÓN',
                text: `[${line}]`
            });
            continue;
        }

        // Song title blocks in quotes or standalone all caps title
        if (/^[“"'][A-ZÁÉÍÓÚÑ\s:()\-]+[”"']$/.test(line) && line.length < 50) {
            parsedLines.push({
                id: parsedLines.length,
                type: 'direction',
                character: 'STAGE DIRECTION / ACOTACIÓN',
                text: `[${line}]`
            });
            continue;
        }

        // Parenthetical stage directions like (Vemos un funeral en escena) or (Sale Delia)
        if ((line.startsWith('(') && line.endsWith(')')) || (line.startsWith('[') && line.endsWith(']'))) {
            parsedLines.push({
                id: parsedLines.length,
                type: 'direction',
                character: 'STAGE DIRECTION / ACOTACIÓN',
                text: line
            });
            continue;
        }

        // Handle inline direction attached to character or text: e.g. "(Aparece de la nada...) BEETLEJUICE"
        const inlineLeadDirectionMatch = line.match(/^(\([^)]+\))\s+([A-ZÁÉÍÓÚÑ0-9\s._'-]{2,30})$/i);
        if (inlineLeadDirectionMatch) {
            parsedLines.push({
                id: parsedLines.length,
                type: 'direction',
                character: 'STAGE DIRECTION / ACOTACIÓN',
                text: inlineLeadDirectionMatch[1]
            });
            line = inlineLeadDirectionMatch[2].trim();
        }

        // Check Pattern 1: Inline character + dialog
        const inlineMatch = line.match(inlinePattern);
        if (inlineMatch) {
            const charCandidate = inlineMatch[1].trim();
            const dialogText = inlineMatch[2].trim();

            if (isLikelyCharacterName(charCandidate)) {
                const charName = cleanCharacterName(charCandidate);
                currentCharacter = charName;
                characterMap.set(charName, (characterMap.get(charName) || 0) + 1);

                parsedLines.push({
                    id: parsedLines.length,
                    type: 'dialog',
                    character: charName,
                    text: dialogText
                });
                continue;
            }
        }

        // Check Pattern 2: Standalone character name
        const standaloneMatch = line.match(standaloneCharPattern);
        if (standaloneMatch && isLikelyCharacterName(standaloneMatch[1])) {
            const charName = cleanCharacterName(standaloneMatch[1]);
            currentCharacter = charName;
            if (!characterMap.has(charName)) {
                characterMap.set(charName, 0);
            }
            continue; // Header line only, character set for subsequent dialog
        }

        // Dialog line belonging to currentCharacter
        if (currentCharacter) {
            characterMap.set(currentCharacter, (characterMap.get(currentCharacter) || 0) + 1);
            parsedLines.push({
                id: parsedLines.length,
                type: 'dialog',
                character: currentCharacter,
                text: line
            });
        } else {
            const fallbackChar = 'NARRATOR';
            characterMap.set(fallbackChar, (characterMap.get(fallbackChar) || 0) + 1);
            parsedLines.push({
                id: parsedLines.length,
                type: 'dialog',
                character: fallbackChar,
                text: line
            });
        }
    }

    // Only keep characters that actually have dialog lines, sorted by line count descending
    const characters = Array.from(characterMap.entries())
        .filter(([_, count]) => count > 0)
        .map(([name, lineCount]) => ({ name, lineCount }))
        .sort((a, b) => b.lineCount - a.lineCount);

    return { characters, lines: parsedLines };
}

function cleanCharacterName(name) {
    return name.trim().toUpperCase().replace(/[:.-]$/, '');
}

function isLikelyCharacterName(name) {
    const trimmed = name.trim().toUpperCase();

    // Exclude common script banners, scene keywords, song titles or known non-character terms
    const nonCharTerms = [
        'ACT', 'ACTO', 'SCENE', 'ESCENA', 'EXT', 'INT', 'FADE', 'CUT', 
        'FIN', 'TELON', 'TELÓN', 'PRÓLOGO', 'PROLOGO', 'CUADRO', 
        'HOGAR', 'PUEDE SER', 'BARBARA 2.0', 'BÁRBARA 2.0', 'SIN RAZÓN', 'SIN RAZON',
        'MAMÁ MUERTA', 'MAMA MUERTA', 'EL SUSTO DE SUS VIDAS', 'HERMOSO TERROR',
        'COSAS SOBRE MUERTE', 'COSAS SOBRE MUERTE PARTE II', 'DAY-O', 'SHAKE SHAKE SHAKE SENORA',
        'YA LO APRENDÍ', 'YA LO APRENDI', 'MI NOMBRE TIENES QUE DECIR', 'MI ACOSADOR'
    ];

    for (const term of nonCharTerms) {
        if (trimmed === term || trimmed.startsWith(term + ' ') || trimmed.startsWith(term + ':')) {
            return false;
        }
    }

    // Must be between 2 and 35 chars, not look like a regular sentence with lowercase
    // Typically theater scripts have names in UPPERCASE or TitleCase
    if (trimmed.length < 2 || trimmed.length > 35) return false;

    // Check against common punctuation that indicates a sentence rather than a character name
    if (/[¿?¡!,;]/.test(trimmed)) return false;

    return true;
}
