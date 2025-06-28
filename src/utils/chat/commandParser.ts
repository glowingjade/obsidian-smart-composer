// src/utils/chat/commandParser.ts

export interface ParsedLinkDepth {
    cleanName: string;
    forward?: number;
    backward?: number;
}

/**
 * Parses a string like "FileName:f2:b1" into a structured object.
 * @param input The string to parse.
 * @returns A ParsedLinkDepth object.
 */
export function parseLinkDepthCommand(input: string): ParsedLinkDepth {
    const result: ParsedLinkDepth = {
        cleanName: input,
    };

    const parts = input.split(':');
    if (parts.length === 1) {
        return result;
    }

    result.cleanName = parts[0];

    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const key = part.charAt(0).toLowerCase();
        const value = parseInt(part.substring(1), 10);

        if (isNaN(value) || value < 0 || value > 5) {
            continue; // Ignore invalid or out-of-range values
        }

        if (key === 'f') {
            result.forward = value;
        } else if (key === 'b') {
            result.backward = value;
        }
    }

    return result;
}