import fs from 'fs';
import path from 'path';

describe('Accessibility Tokens WCAG Gate', () => {
    const scanDirectory = (dir: string, extensions: string[]): string[] => {
        const files: string[] = [];

        const walk = (currentPath: string) => {
            const entries = fs.readdirSync(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);

                if (entry.isDirectory()) {
                    walk(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    const isTestFile = entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx') || entry.name.endsWith('.d.ts');

                    if (!isTestFile && extensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        };

        walk(dir);
        return files;
    };

    const getFileContent = (filePath: string): string => {
        return fs.readFileSync(filePath, 'utf-8');
    };

    const checkReglaA = (
        content: string,
        filePath: string,
    ): { violations: { line: number; token: string }[]; file: string } => {
        const violations: { line: number; token: string }[] = [];
        const statusTokens = ['success', 'warning', 'destructive', 'info'];

        const lines = content.split('\n');

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];

            for (const status of statusTokens) {
                // Match text-<status> (with optional Tailwind modifiers like hover:, dark:, etc.)
                // Pattern: optional modifier prefix, then text-<status> without any suffix
                const pattern = new RegExp(`\\b(\\w*:)*text-${status}(?![-\\w])`, 'g');

                let match;
                while ((match = pattern.exec(line)) !== null) {
                    const foundToken = match[0];

                    // Extract just the token part (remove modifiers)
                    const tokenPart = foundToken.split(':').pop() ?? foundToken;

                    // Every match of the regex is a violation by definition
                    // (the lookahead ensures no suffix follows)
                    violations.push({
                        line: lineNum + 1,
                        token: tokenPart,
                    });
                }
            }
        }

        return { violations, file: filePath };
    };

    const checkReglaB = (
        content: string,
        filePath: string,
    ): { violations: { line: number; token: string }[]; file: string } => {
        const violations: { line: number; token: string }[] = [];
        const statusTokens = ['success', 'warning', 'destructive', 'info'];

        const lines = content.split('\n');

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];

            for (const status of statusTokens) {
                // Case 1: Match border-<status>/ (without -accent) — any alpha is a violation
                const caseOnePattern = new RegExp(`\\b(\\w*:)*border-${status}/(?!-)`, 'g');

                let match;
                while ((match = caseOnePattern.exec(line)) !== null) {
                    const matchStart = match.index;
                    const matchEnd = matchStart + match[0].length;

                    // Extract the alpha value (e.g., "border-info/25")
                    const afterMatch = line.substring(matchEnd);
                    const alphaPattern = /^(\d+)/;
                    const alphaMatch = alphaPattern.exec(afterMatch);
                    const alpha = alphaMatch?.[1] ?? '';
                    const foundToken = `${match[0]}${alpha}`;

                    violations.push({
                        line: lineNum + 1,
                        token: foundToken,
                    });
                }

                // Case 2: Match border-<status>-accent/<alpha> where alpha !== 30
                const caseTwoPattern = new RegExp(`\\b(\\w*:)*border-${status}-accent/(\\d+)`, 'g');

                while ((match = caseTwoPattern.exec(line)) !== null) {
                    const fullMatch = match[0];
                    // Extract alpha from the end (e.g., "border-destructive-accent/50" -> "50")
                    const alphaExtractPattern = /\/(\d+)$/;
                    const alphaMatch = alphaExtractPattern.exec(fullMatch);
                    const alpha = alphaMatch?.[1] ?? '';

                    if (alpha !== '30') {
                        violations.push({
                            line: lineNum + 1,
                            token: fullMatch,
                        });
                    }
                }
            }
        }

        return { violations, file: filePath };
    };

    it('should not have text tokens with insufficient contrast (Regla A)', () => {
        const dirs = [
            path.join(__dirname, '../presentation'),
            path.join(__dirname, '../constants'),
        ];

        const allViolations: { file: string; line: number; token: string }[] = [];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) continue;

            const files = scanDirectory(dir, ['.ts', '.tsx']);

            for (const file of files) {
                const content = getFileContent(file);
                const result = checkReglaA(content, file);

                for (const violation of result.violations) {
                    allViolations.push({
                        file: path.relative(process.cwd(), file),
                        line: violation.line,
                        token: violation.token,
                    });
                }
            }
        }

        if (allViolations.length > 0) {
            const message = allViolations
                .map((v) => `${v.file}:${v.line.toString()} - Found '${v.token}' without -accent, -foreground, or -subtle suffix`)
                .join('\n');

            throw new Error(`Regla A violations found:\n${message}`);
        }
    });

    it('should normalize border tokens with alpha to -accent/30 (Regla B)', () => {
        const dirs = [
            path.join(__dirname, '../presentation'),
            path.join(__dirname, '../constants'),
        ];

        const allViolations: { file: string; line: number; token: string }[] = [];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) continue;

            const files = scanDirectory(dir, ['.ts', '.tsx']);

            for (const file of files) {
                const content = getFileContent(file);
                const result = checkReglaB(content, file);

                for (const violation of result.violations) {
                    allViolations.push({
                        file: path.relative(process.cwd(), file),
                        line: violation.line,
                        token: violation.token,
                    });
                }
            }
        }

        if (allViolations.length > 0) {
            const message = allViolations
                .map((v) => `${v.file}:${v.line.toString()} - Found '${v.token}' but expected '-accent/30' pattern`)
                .join('\n');

            throw new Error(`Regla B violations found:\n${message}`);
        }
    });
});
