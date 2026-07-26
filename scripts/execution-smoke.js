/* eslint-disable no-console */
const {
    runInVercelSandbox,
} = require('../server/sandbox-execution');

const examples = {
    java: {
        source:
            'import java.util.*; public class Main { public static void main(String[] args) { Scanner input = new Scanner(System.in); List<Integer> values = new ArrayList<>(); values.add(input.nextInt()); System.out.println("Java ✓ " + (values.get(0) + 2)); } }',
        stdin: '40\n',
        expected: 'Java ✓ 42',
    },
    python: {
        source: 'value = int(input())\nprint(f"Python {value + 2}")',
        stdin: '40\n',
        expected: 'Python 42',
    },
    c: {
        source:
            '#include <stdio.h>\nint main(void) { int value; scanf("%d", &value); printf("C %d\\n", value + 2); return 0; }',
        stdin: '40\n',
        expected: 'C 42',
    },
    cpp: {
        source:
            '#include <bits/stdc++.h>\nusing namespace std;\nint main() { int value; cin >> value; vector<int> values{value}; cout << "C++ " << values[0] + 2 << "\\n"; }',
        stdin: '40\n',
        expected: 'C++ 42',
    },
    sql: {
        source:
            "CREATE TABLE totals (value INTEGER);\nINSERT INTO totals VALUES (40);\nSELECT 'SQL ' || (value + 2) AS result FROM totals;",
        stdin: '',
        expected: 'SQL 42',
    },
};

const run = async () => {
    const selectedLanguages = process.argv.slice(2);
    const languages =
        selectedLanguages.length > 0
            ? selectedLanguages
            : Object.keys(examples);
    const endpoint = process.env.SYNCDEV_EXECUTION_URL;

    for (const language of languages) {
        const example = examples[language];
        if (!example) throw new Error(`No smoke example for ${language}.`);
        const request = {
            language,
            source: example.source,
            stdin: example.stdin,
            timeout: 6000,
        };
        let output;
        if (endpoint) {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(request),
            });
            output = await response.json();
            if (!response.ok) {
                throw new Error(
                    `${language} returned ${response.status}: ${
                        output.message || 'unknown error'
                    }`
                );
            }
        } else {
            output = await runInVercelSandbox(request);
        }

        if (
            output.status !== 'success' ||
            !output.stdout.includes(example.expected)
        ) {
            throw new Error(
                `${language} failed: ${JSON.stringify(output)}`
            );
        }
        console.log(
            `${language}: ${output.stdout.trim()} (${output.duration}ms)`
        );
    }
};

run().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
