export const LANGUAGES = [
    { id: 'javascript', label: 'JavaScript', mode: 'javascript' },
    {
        id: 'typescript',
        label: 'TypeScript',
        mode: { name: 'javascript', typescript: true },
    },
    { id: 'jsx', label: 'JavaScript React', mode: 'jsx' },
    {
        id: 'tsx',
        label: 'TypeScript React',
        mode: {
            name: 'jsx',
            base: { name: 'javascript', typescript: true },
        },
    },
    { id: 'html', label: 'HTML', mode: 'htmlmixed' },
    { id: 'css', label: 'CSS', mode: 'css' },
    { id: 'scss', label: 'SCSS', mode: 'text/x-scss' },
    {
        id: 'json',
        label: 'JSON',
        mode: { name: 'javascript', json: true },
    },
    { id: 'python', label: 'Python', mode: 'python' },
    { id: 'java', label: 'Java', mode: 'text/x-java' },
    { id: 'c', label: 'C', mode: 'text/x-csrc' },
    { id: 'cpp', label: 'C++', mode: 'text/x-c++src' },
    { id: 'csharp', label: 'C#', mode: 'text/x-csharp' },
    { id: 'kotlin', label: 'Kotlin', mode: 'text/x-kotlin' },
    { id: 'go', label: 'Go', mode: 'text/x-go' },
    { id: 'rust', label: 'Rust', mode: 'text/x-rustsrc' },
    { id: 'php', label: 'PHP', mode: 'application/x-httpd-php' },
    { id: 'ruby', label: 'Ruby', mode: 'ruby' },
    { id: 'swift', label: 'Swift', mode: 'swift' },
    { id: 'sql', label: 'SQL', mode: 'text/x-sql' },
    { id: 'shell', label: 'Shell Script', mode: 'shell' },
    { id: 'markdown', label: 'Markdown', mode: 'gfm' },
    { id: 'yaml', label: 'YAML', mode: 'yaml' },
    { id: 'xml', label: 'XML', mode: 'xml' },
    { id: 'plain', label: 'Plain Text', mode: null },
];

export const LANGUAGE_MAP = LANGUAGES.reduce((languages, language) => {
    languages[language.id] = language;
    return languages;
}, {});

const countMatches = (source, expressions) =>
    expressions.reduce((score, expression) => {
        const matches = source.match(expression);
        return score + (matches ? matches.length : 0);
    }, 0);

const looksLikeJson = (source) => {
    if (!/^(?:\[|{)/.test(source)) {
        return false;
    }

    try {
        JSON.parse(source);
        return true;
    } catch (error) {
        return false;
    }
};

export const detectLanguage = (code = '') => {
    const source = code.trim();

    if (!source) {
        return 'javascript';
    }

    if (looksLikeJson(source)) return 'json';
    if (/^<\?php\b/i.test(source)) return 'php';
    if (/^<\?xml\b/i.test(source)) return 'xml';
    if (/^#!.*\b(bash|sh|zsh|fish)\b/m.test(source)) return 'shell';
    const looksLikeReact = /\b(import\s+React|from\s+['"]react['"]|<[A-Z][\w.]*\b|return\s*\(\s*<|\bclassName=)/.test(source);
    if (looksLikeReact) {
        return /\b(interface|type)\s+[A-Z]\w*|:\s*(?:string|number|boolean)(?:\[\])?/.test(source)
            ? 'tsx'
            : 'jsx';
    }
    if (/<!doctype\s+html|<html\b|<(?:div|main|section|article|body|head|h[1-6]|p|span|button|input|form|nav|header|footer|script|style)\b/i.test(source)) {
        return 'html';
    }

    const scores = {
        typescript: countMatches(source, [
            /\b(interface|type|enum|namespace)\s+[A-Z]\w*/g,
            /:\s*(string|number|boolean|unknown|never|void|any)(?:\[\])?/g,
            /\b(?:public|private|protected|readonly)\s+\w+/g,
            /\bas\s+(?:const|\w+)/g,
        ]),
        python: countMatches(source, [
            /^\s*(?:async\s+)?def\s+\w+\s*\(/gm,
            /^\s*from\s+[\w.]+\s+import\s+/gm,
            /^\s*import\s+[\w.]+/gm,
            /\b(self|elif|None|True|False)\b/g,
            /:\s*(?:#.*)?$/gm,
        ]),
        java: countMatches(source, [
            /\bpublic\s+static\s+void\s+main\s*\(/g,
            /\bSystem\.(?:out|err)\./g,
            /\b(?:public|private|protected)\s+class\s+\w+/g,
            /\b(?:String|Integer|Boolean)\s+\w+/g,
        ]),
        cpp: countMatches(source, [
            /#include\s*[<"](?:iostream|vector|string|map|algorithm)/g,
            /\bstd::/g,
            /\b(?:cout|cin)\s*(?:<<|>>)/g,
            /\busing\s+namespace\s+std\b/g,
        ]),
        c: countMatches(source, [
            /#include\s*[<"](?:stdio|stdlib|string)\.h/g,
            /\b(?:printf|scanf|malloc|free)\s*\(/g,
            /\b(?:struct|typedef)\s+\w+/g,
            /\bint\s+main\s*\(/g,
        ]),
        csharp: countMatches(source, [
            /\busing\s+System\b/g,
            /\bConsole\.(?:WriteLine|ReadLine)/g,
            /\bnamespace\s+[\w.]+/g,
        ]),
        kotlin: countMatches(source, [
            /\bfun\s+main\s*\(/g,
            /\b(?:val|var)\s+\w+/g,
            /\bdata\s+class\s+\w+/g,
            /\bprintln\s*\(/g,
        ]),
        go: countMatches(source, [
            /^\s*package\s+\w+/gm,
            /\bfunc\s+\w+\s*\(/g,
            /\bfmt\.(?:Print|Printf|Println)/g,
            /:=/g,
        ]),
        rust: countMatches(source, [
            /\bfn\s+main\s*\(/g,
            /\b(?:let\s+mut|impl|trait|match)\b/g,
            /\b(?:println|format|vec)!/g,
            /\buse\s+std::/g,
        ]),
        ruby: countMatches(source, [
            /^\s*def\s+\w+[!?=]?/gm,
            /^\s*(?:class|module)\s+\w+/gm,
            /^\s*end\s*$/gm,
            /\b(?:puts|require)\b/g,
        ]),
        swift: countMatches(source, [
            /\bimport\s+(?:SwiftUI|UIKit|Foundation)\b/g,
            /\bfunc\s+\w+\s*\(/g,
            /\b(?:let|var)\s+\w+\s*:\s*[A-Z]\w*/g,
            /@(?:State|Binding|main|Published)\b/g,
        ]),
        sql: countMatches(source, [
            /\bSELECT\b[\s\S]+\bFROM\b/gi,
            /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/gi,
            /\b(?:INNER|LEFT|RIGHT)?\s*JOIN\b/gi,
        ]),
        scss: countMatches(source, [
            /^\s*\$[\w-]+\s*:/gm,
            /@(mixin|include|extend|function)\b/g,
            /&(?:\[|[:.#])/g,
        ]),
        css: countMatches(source, [
            /(?:^|})\s*[.#]?[\w-]+(?:\s+[.#]?[\w-]+)*\s*\{/gm,
            /\b(?:color|display|position|margin|padding|background|font-size)\s*:/g,
            /@(?:media|keyframes|supports)\b/g,
        ]),
        yaml: countMatches(source, [
            /^---\s*$/gm,
            /^\s*[\w.-]+:\s*(?:[^{};]|$)/gm,
            /^\s*-\s+[\w"']/gm,
        ]),
        markdown: countMatches(source, [
            /^#{1,6}\s+.+/gm,
            /```[\w-]*\n/g,
            /\[[^\]]+\]\([^)]+\)/g,
            /^\s*[-*+]\s+.+/gm,
        ]),
        shell: countMatches(source, [
            /^\s*(?:echo|export|source|cd|pwd|mkdir|touch|chmod)\b/gm,
            /\$(?:\w+|\{\w+\})/g,
            /^\s*(?:if|while)\s+\[\s/gm,
        ]),
    };

    const [bestLanguage, bestScore] = Object.entries(scores).reduce(
        (best, entry) => (entry[1] > best[1] ? entry : best),
        ['javascript', 0]
    );

    if (bestScore >= 2) {
        return bestLanguage;
    }

    if (/\b(const|let|var|function|async|await|console\.|=>|require\()/.test(source)) {
        return 'javascript';
    }

    if (/^\s*<[/!]?[-\w:]+(?:\s|>)/m.test(source)) return 'xml';
    return 'plain';
};
