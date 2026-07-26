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

const scoreMatches = (source, signatures) =>
    signatures.reduce((score, [expression, weight]) => {
        const matches = source.match(expression);
        return score + (matches ? matches.length * weight : 0);
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
        javascript: scoreMatches(source, [
            [/\b(?:const|let|var)\s+[A-Za-z_$][\w$]*/g, 2],
            [/\b(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/g, 4],
            [/(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g, 4],
            [/\bconsole\.(?:log|error|warn|info)\s*\(/g, 4],
            [/\b(?:require\s*\(|module\.exports|exports\.)/g, 4],
            [/\b(?:document|window)\.[A-Za-z_$][\w$]*/g, 3],
        ]),
        typescript: scoreMatches(source, [
            [/\b(?:interface|type|enum|namespace)\s+[A-Z]\w*/g, 5],
            [/:\s*(?:string|number|boolean|unknown|never|void|any)(?:\[\])?/g, 4],
            [/\b(?:public|private|protected|readonly)\s+\w+\s*[?:=]/g, 3],
            [/\bas\s+(?:const|\w+)/g, 3],
            [/\b(?:implements|keyof|typeof)\s+\w+/g, 3],
        ]),
        python: scoreMatches(source, [
            [/^\s*(?:async\s+)?def\s+\w+\s*\(/gm, 5],
            [/^\s*from\s+[\w.]+\s+import\s+/gm, 4],
            [/^\s*import\s+[\w.]+/gm, 2],
            [/\b(?:self|elif|None|True|False)\b/g, 3],
            [/^\s*(?:class|if|for|while|try|with)\b.*:\s*(?:#.*)?$/gm, 3],
            [/\bprint\s*\(/g, 2],
        ]),
        java: scoreMatches(source, [
            [/\bpublic\s+static\s+void\s+main\s*\(\s*String(?:\[\]|\s*\.\.\.)/g, 8],
            [/\bSystem\.(?:out|err)\.(?:print|println|printf)\s*\(/g, 6],
            [/^\s*(?:package|import)\s+java(?:x)?\.[\w.*]+\s*;/gm, 6],
            [/\bpublic\s+(?:(?:abstract|final|sealed|strictfp)\s+)*class\s+\w+/g, 5],
            [/\b(?:class|record|interface|enum)\s+[A-Z]\w*/g, 1],
            [/\b(?:String|Integer|Boolean|Long|Double|List|Map|Set)\s*(?:<[^;=()]+>)?(?:\[\])?\s+\w+/g, 3],
            [/\b(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?(?:void|boolean|byte|short|int|long|float|double|char|String|[A-Z]\w*)\s+\w+\s*\(/g, 4],
            [/\bnew\s+[A-Z]\w*(?:<[^>]+>)?\s*\(/g, 2],
            [/@(?:Override|Deprecated|SuppressWarnings)\b/g, 3],
        ]),
        cpp: scoreMatches(source, [
            [/#include\s*[<"](?:iostream|vector|string|map|algorithm|memory|utility)>?/g, 7],
            [/\bstd::/g, 5],
            [/\b(?:cout|cin|cerr)\s*(?:<<|>>)/g, 5],
            [/\busing\s+namespace\s+std\b/g, 5],
            [/\btemplate\s*<[^>]+>/g, 4],
            [/\b(?:vector|string|map|unordered_map|unique_ptr|shared_ptr)\s*</g, 3],
        ]),
        c: scoreMatches(source, [
            [/#include\s*[<"](?:stdio|stdlib|string|stdint|stdbool)\.h>?/g, 7],
            [/\b(?:printf|scanf|malloc|calloc|realloc|free)\s*\(/g, 4],
            [/\b(?:struct|typedef)\s+\w+/g, 3],
            [/\bint\s+main\s*\(\s*(?:void|int\s+\w+\s*,)?/g, 3],
            [/\b(?:size_t|uint\d+_t|int\d+_t)\b/g, 3],
        ]),
        csharp: scoreMatches(source, [
            [/\busing\s+System(?:\.[\w.]+)?\s*;/g, 7],
            [/\bConsole\.(?:WriteLine|ReadLine|Write|Read)\s*\(/g, 6],
            [/\bnamespace\s+[\w.]+/g, 4],
            [/\b(?:string|bool|decimal)\s+\w+/g, 2],
        ]),
        kotlin: scoreMatches(source, [
            [/\bfun\s+main\s*\(/g, 7],
            [/\b(?:val|var)\s+\w+/g, 2],
            [/\bdata\s+class\s+\w+/g, 5],
            [/\bprintln\s*\(/g, 3],
            [/\b(?:object|companion\s+object)\s+\w+/g, 4],
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
        sql: scoreMatches(source, [
            [/^\s*(?:SELECT|WITH)\b/gim, 4],
            [/\bSELECT\b[\s\S]+\bFROM\b/gi, 5],
            [/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b/gi, 5],
            [/\b(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\b/gi, 4],
            [/\b(?:WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|PRAGMA)\b/gi, 2],
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
