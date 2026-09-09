/**
 * Parses script text into structured lines and extracts detected characters.
 */
export function parseScript(rawText) {
    if (!rawText || !rawText.trim()) {
        return { characters: [], lines: [] };
    }

    const rawLines = rawText.split(/\r?\n/);
    const parsedLines = [];
    const characterMap = new Map(); // name -> count

    const inlinePattern = /^\s*([A-Z0-9\s._'-]{2,25})\s*(?:\([^)]*\))?\s*[:.-]\s*(.+)$/i;
    const standaloneCharPattern = /^\s*([A-Z0-9\s._'-]{2,25})\s*(?:\([^)]*\))?\s*$/;

    let currentCharacter = null;

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;

        // Ignore scene headings or stage directions in brackets/parentheses like [Exit HAMLET] or (Stage direction)
        if ((line.startsWith('(') && line.endsWith(')')) || (line.startsWith('[') && line.endsWith(']'))) {
            parsedLines.push({
                id: parsedLines.length,
                type: 'direction',
                character: 'STAGE DIRECTION / ACOTACIÓN',
                text: line
            });
            continue;
        }

        const inlineMatch = line.match(inlinePattern);
        if (inlineMatch) {
            const charName = cleanCharacterName(inlineMatch[1]);
            const dialogText = inlineMatch[2].trim();

            if (charName && isLikelyCharacterName(charName)) {
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

        const standaloneMatch = line.match(standaloneCharPattern);
        if (standaloneMatch && isLikelyCharacterName(standaloneMatch[1])) {
            currentCharacter = cleanCharacterName(standaloneMatch[1]);
            characterMap.set(currentCharacter, characterMap.get(currentCharacter) || 0);
            continue; // Header line only, dialog follows on next line(s)
        }

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

    const characters = Array.from(characterMap.entries()).map(([name, lineCount]) => ({
        name,
        lineCount
    }));

    return { characters, lines: parsedLines };
}

function cleanCharacterName(name) {
    return name.trim().toUpperCase().replace(/[:.-]$/, '');
}

function isLikelyCharacterName(name) {
    const trimmed = name.trim();
    if (/^(ACT|ACTO|SCENE|ESCENA|EXT|INT|FADE|CUT)\b/i.test(trimmed)) {
        return false;
    }
    return trimmed.length >= 2 && trimmed.length <= 30;
}
