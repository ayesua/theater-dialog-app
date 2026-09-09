const nonStartWords = new Set([
    'PERO', 'PORQUE', 'CUANDO', 'DONDE', 'COMO', 'SI', 'NO', 'AUNQUE', 'MIENTRAS',
    'PUES', 'ASI', 'ASÍ', 'LUEGO', 'ENTONCES', 'DESPUES', 'DESPUÉS', 'ANTES',
    'TAMBIEN', 'TAMBIÉN', 'TAMPOCO', 'SOLO', 'SÓLO', 'YA', 'MAS', 'MÁS', 'MUY',
    'TAN', 'NADA', 'NADIE', 'NUNCA', 'JAMAS', 'JAMÁS', 'SIEMPRE',
    'ESTE', 'ESTA', 'ESTO', 'ESTOS', 'ESTAS', 'ESE', 'ESA', 'ESO', 'ESOS', 'ESAS',
    'AQUEL', 'AQUELLA', 'AQUELLO', 'QUE', 'QUÉ', 'QUIEN', 'QUIÉN', 'CUAL', 'CUÁL',
    'CUANTO', 'CUÁNTO', 'HAY', 'ERA', 'ERAN', 'FUE', 'FUERON', 'SERA', 'SERÁ', 'ES',
    'SON', 'SOY', 'ERES', 'SOMOS', 'ESTABA', 'TENGO', 'TIENE', 'TIENEN', 'VAMOS', 'VOY', 'VA', 'VAN',
    'VIENE', 'VIENEN', 'DICE', 'DICEN', 'DICES', 'DIRÁ', 'DIRÁS', 'DIJO', 'DIJERON', 'CONTESTA', 'CONTESTARÁ', 'QUIERO', 'QUIERE',
    'QUIEREN', 'PUEDO', 'PUEDE', 'PUEDEN', 'SABES', 'SABE', 'SABEN', 'VEO', 'VES', 'VE', 'VEN',
    'HE', 'HAS', 'HA', 'HEMOS', 'HAN', 'HABÍA', 'HABÍAN',
    'DE', 'DEL', 'EN', 'POR', 'PARA', 'CON', 'SIN', 'SOBRE', 'HACIA', 'DESDE', 'HASTA',
    'UN', 'UNA', 'UNOS', 'UNAS', 'EL', 'LA', 'LAS', 'MI', 'MIS', 'TU', 'TUS', 'SU', 'SUS',
    'ME', 'TE', 'SE', 'NOS', 'LE', 'LES', 'DAY', 'WORK', 'SHAKE', 'AH', 'OH', 'HEY', 'OK', 'BLA',
    'Y', 'O', 'E', 'U', 'AHI', 'AHÍ', 'AQUÍ', 'AQUI', 'ALLÍ', 'ALLI', 'ALLÁ', 'ALLA'
]);

const nonCharTerms = new Set([
    'ACT', 'ACTO', 'SCENE', 'ESCENA', 'EXT', 'INT', 'FADE', 'CUT', 
    'FIN', 'TELON', 'TELÓN', 'PRÓLOGO', 'PROLOGO', 'CUADRO', 
    'HOGAR', 'PUEDE SER', 'BARBARA 2.0', 'BÁRBARA 2.0', 'SIN RAZÓN', 'SIN RAZON',
    'MAMÁ MUERTA', 'MAMA MUERTA', 'EL SUSTO DE SUS VIDAS', 'HERMOSO TERROR',
    'COSAS SOBRE MUERTE', 'COSAS SOBRE MUERTE PARTE II', 'DAY-O', 'SHAKE SHAKE SHAKE SENORA',
    'YA LO APRENDÍ', 'YA LO APRENDI', 'MI NOMBRE TIENES QUE DECIR', 'MI ACOSADOR',
    'FINAL DEL PRIMER ACTO', 'FINAL DEL SEGUNDO ACTO', 'DIES IRAE', 'SER PAPÁS',
    'AH AH AH AH', 'AÚN NO', 'HOY NO', 'REGLA NÚMERO 1', 'REGLA NÚMERO DOS',
    'EXORCISMO', 'VÁMONOS A CASA', 'AYUDAR ES SU PROFESION', 'SOMOS MAS ASTUTOS',
    'JAMAS PODRÁS CAMBIARME', 'EL SE VA A ARREPENTIR', 'DISCULPE SR', 'GATOS DEBERÁS COMPRAR',
    'PORQUE NO DAN MIEDO', 'SOMOS SOLO UNA PAREJA NORMAL', 'NO SOMOS UNA FAMILIA',
    'REALMENTE ME AGRADAN', 'ALÉJATE DE ELLA', 'SE PINTAN CASAS A DOMICILIO',
    'REALMENTE ES EL SEGUNDO NOMBRE', 'ALGUIEN CON LA SERIEDAD', 'DE SOLO UN MONTÓN',
    'Y TU ESPOSO EN ACAPULCO', 'DECAPITAR', 'ESPANTAR', 'DEJEN ATRÁS ESOS SUSTOS CORRIENTES',
    'QUE LA IRA NO LOS MATA', 'MUEREN BEBÉS LES DOY PUNTOS EXTRA', 'NO PUEDEN NI A UNA MOSCA ESPANTAR',
    'YA TODO ESO ESTA POR TERMINAR'
]);

function cleanCharacterName(name) {
    let cleaned = name.trim().toUpperCase().replace(/[:.-]$/, '').trim();
    if (cleaned.endsWith(' DICEN') || cleaned.endsWith(' DICE')) {
        cleaned = cleaned.replace(/\s+DICE[N]?$/, '').trim();
    }
    return cleaned;
}

function isValidCharacterHeading(line, hasContextOrColon) {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // Colon pattern: e.g. "LYDIA:"
    if (/^[A-ZÁÉÍÓÚÑ0-9\s._'\/-]{2,35}:$/.test(trimmed)) {
        const withoutColon = trimmed.slice(0, -1).trim();
        const words = withoutColon.split(/\s+/);
        if (words.length <= 4 && !nonCharTerms.has(withoutColon) && !nonStartWords.has(words[0])) {
            return true;
        }
        return false;
    }

    if (!hasContextOrColon) return false;
    if (/[.,;?!¡¿"“”'`]/.test(trimmed)) return false;
    if (trimmed !== trimmed.toUpperCase()) return false;

    const words = trimmed.split(/\s+/);
    if (words.length > 4) return false;

    if (nonCharTerms.has(trimmed)) return false;
    if (nonStartWords.has(words[0])) return false;

    if (words.length === 1 && /^[A-ZÁÉÍÓÚÑ]+(AR|ER|IR)$/.test(trimmed)) return false;
    if (words[0] === 'LOS' && words.length > 1 && nonStartWords.has(words[1])) return false;

    return true;
}

export function parseScript(rawText) {
    if (!rawText || !rawText.trim()) {
        return { characters: [], lines: [] };
    }

    const rawLines = rawText.split(/\r?\n/);
    const parsedLines = [];
    const characterMap = new Map();

    let currentCharacter = null;
    let prevWasEmptyOrDir = true;

    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim();
        if (!line) {
            prevWasEmptyOrDir = true;
            continue;
        }

        // Clean script comments or template headers if any
        if (line.startsWith('export const') || line.endsWith('`;')) {
            line = line.replace('export const BEETLEJUICE_SAMPLE = `', '').replace('`;', '').trim();
            if (!line) continue;
        }

        // Clean page headers/footers like "Beetlejuice México 1"
        if (/^Beetlejuice\s+M[eé]xico\s+\d+$/i.test(line) || /^\d+$/.test(line)) {
            continue;
        }

        // Clean scene and act headers
        if (/^(ACTO\s+[IVXLCDM\d]+|ESCENA\s+\d+|FIN\s+DEL\s+[A-Z\s]+)/i.test(line)) {
            parsedLines.push({
                id: parsedLines.length,
                type: 'direction',
                character: 'STAGE DIRECTION / ACOTACIÓN',
                text: `[${line}]`
            });
            prevWasEmptyOrDir = true;
            continue;
        }

        // Song title blocks in quotes
        if (/^[“"'][A-ZÁÉÍÓÚÑ\s:()\-]+[”"']$/.test(line) && line.length < 50) {
            parsedLines.push({
                id: parsedLines.length,
                type: 'direction',
                character: 'STAGE DIRECTION / ACOTACIÓN',
                text: `[${line}]`
            });
            prevWasEmptyOrDir = true;
            continue;
        }

        // Parenthetical stage directions
        if ((line.startsWith('(') && line.endsWith(')')) || (line.startsWith('[') && line.endsWith(']'))) {
            parsedLines.push({
                id: parsedLines.length,
                type: 'direction',
                character: 'STAGE DIRECTION / ACOTACIÓN',
                text: line
            });
            prevWasEmptyOrDir = true;
            continue;
        }

        // Pattern 1: Inline character + dialog: "CHARACTER: Dialog" or "CHARACTER - Dialog"
        const inlineColonMatch = line.match(/^([A-ZÁÉÍÓÚÑ0-9\s._'\/-]{2,30})\s*(?:\([^)]*\))?\s*:\s*(.+)$/);
        const inlineDashMatch = !inlineColonMatch ? line.match(/^([A-ZÁÉÍÓÚÑ0-9\s._'\/-]{2,30})\s*(?:\([^)]*\))?\s+[-–—]\s+(.+)$/) : null;
        const inlineMatch = inlineColonMatch || inlineDashMatch;

        if (inlineMatch) {
            const rawCandidate = inlineMatch[1].trim();
            const dialogText = inlineMatch[2].trim();

            if (isValidCharacterHeading(rawCandidate, true)) {
                const charName = cleanCharacterName(rawCandidate);
                currentCharacter = charName;
                characterMap.set(charName, (characterMap.get(charName) || 0) + 1);

                parsedLines.push({
                    id: parsedLines.length,
                    type: 'dialog',
                    character: charName,
                    text: dialogText
                });
                prevWasEmptyOrDir = false;
                continue;
            }
        }

        // Pattern 2: Standalone character name
        if (isValidCharacterHeading(line, prevWasEmptyOrDir)) {
            const charName = cleanCharacterName(line);
            currentCharacter = charName;
            if (!characterMap.has(charName)) {
                characterMap.set(charName, 0);
            }
            prevWasEmptyOrDir = false;
            continue;
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
        prevWasEmptyOrDir = false;
    }

    const characters = Array.from(characterMap.entries())
        .filter(([_, count]) => count > 0)
        .map(([name, lineCount]) => ({ name, lineCount }))
        .sort((a, b) => b.lineCount - a.lineCount);

    return { characters, lines: parsedLines };
}
