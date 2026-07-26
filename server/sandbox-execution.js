const EXECUTABLE_LANGUAGES = new Set([
    'java',
    'python',
    'c',
    'cpp',
]);

const FILES = {
    python: {
        sourcePath: 'main.py',
        compile: null,
        run: 'python3 main.py < stdin.txt',
    },
    c: {
        sourcePath: 'main.c',
        compile: ['gcc', ['main.c', '-O2', '-std=c17', '-o', 'main']],
        run: './main < stdin.txt',
    },
    cpp: {
        sourcePath: 'main.cpp',
        compile: ['g++', ['main.cpp', '-O2', '-std=c++17', '-o', 'main']],
        run: './main < stdin.txt',
    },
};

const javaTarget = (source) => {
    const packageName =
        source.match(
            /^\s*package\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*;/m
        )?.[1] || '';
    const className =
        source.match(
            /\bpublic\s+(?:(?:abstract|final|sealed|strictfp)\s+)*class\s+([A-Za-z_$][\w$]*)/
        )?.[1] ||
        source.match(/\bclass\s+([A-Za-z_$][\w$]*)/)?.[1] ||
        'Main';
    const directory = packageName.replaceAll('.', '/');
    const sourcePath = directory
        ? `${directory}/${className}.java`
        : `${className}.java`;
    const runtimeClass = packageName
        ? `${packageName}.${className}`
        : className;

    return {
        sourcePath,
        compile: ['javac', ['-encoding', 'UTF-8', '-d', '.', sourcePath]],
        run: `java ${runtimeClass} < stdin.txt`,
    };
};

const executionSpec = (language, source) => {
    if (language === 'java') return javaTarget(source);
    return FILES[language];
};

const outputOf = async (command) => {
    const [stdout, stderr] = await Promise.all([
        command.stdout(),
        command.stderr(),
    ]);
    return { stdout, stderr };
};

const truncate = (value, limit = 50000) =>
    String(value || '').slice(0, limit);

const readOutputFile = async (sandbox, path) => {
    try {
        return truncate(
            await sandbox.fs.readFile(path, { encoding: 'utf8' })
        );
    } catch (error) {
        return '';
    }
};

const runInVercelSandbox = async (
    { language, source, stdin, timeout },
    { SandboxClass, snapshotId } = {}
) => {
    if (!EXECUTABLE_LANGUAGES.has(language)) {
        throw new Error(`Sandbox execution is unavailable for ${language}.`);
    }

    const resolvedSnapshotId =
        snapshotId || process.env.CODE_EXECUTION_SANDBOX_SNAPSHOT;
    if (!resolvedSnapshotId) {
        const error = new Error(
            'The isolated execution runtime is not configured.'
        );
        error.code = 'SANDBOX_NOT_CONFIGURED';
        throw error;
    }

    // Use the SDK's native ESM export. Its CommonJS compatibility build pulls
    // in an ESM-only serializer and fails in the Vercel function runtime.
    const Sandbox =
        SandboxClass || (await import('@vercel/sandbox')).Sandbox;
    const startedAt = Date.now();
    const spec = executionSpec(language, source);
    const sandbox = await Sandbox.create({
        source: {
            type: 'snapshot',
            snapshotId: resolvedSnapshotId,
        },
        timeout: Math.max(15000, timeout + 8000),
        resources: { vcpus: 1 },
        networkPolicy: 'deny-all',
        persistent: false,
        tags: { purpose: 'syncdev-execution', language },
    });

    try {
        const directory = spec.sourcePath.includes('/')
            ? spec.sourcePath.slice(0, spec.sourcePath.lastIndexOf('/'))
            : '';
        if (directory) {
            await sandbox.fs.mkdir(directory, { recursive: true });
        }
        await Promise.all([
            sandbox.fs.writeFile(spec.sourcePath, source),
            sandbox.fs.writeFile('stdin.txt', stdin),
            sandbox.fs.writeFile('stdout.txt', ''),
            sandbox.fs.writeFile('stderr.txt', ''),
        ]);

        if (spec.compile) {
            const [command, args] = spec.compile;
            const compilation = await sandbox.runCommand(command, args, {
                timeoutMs: Math.max(5000, Math.min(timeout + 3000, 12000)),
            });
            const compilationOutput = await outputOf(compilation);
            if (compilation.exitCode !== 0) {
                return {
                    stdout: truncate(compilationOutput.stdout),
                    stderr: truncate(compilationOutput.stderr),
                    exitCode: compilation.exitCode,
                    duration: Date.now() - startedAt,
                    status: 'error',
                    provider: 'vercel-sandbox',
                };
            }
        }

        const execution = await sandbox.runCommand({
            cmd: 'bash',
            args: [
                '-lc',
                `ulimit -f 128 -u 64; ${spec.run} > stdout.txt 2> stderr.txt`,
            ],
            timeoutMs: timeout,
        });
        const [stdout, stderr] = await Promise.all([
            readOutputFile(sandbox, 'stdout.txt'),
            readOutputFile(sandbox, 'stderr.txt'),
        ]);
        const timedOut =
            execution.exitCode === 124 || execution.exitCode === 137;

        return {
            stdout,
            stderr:
                timedOut && !stderr
                    ? `Execution timed out after ${timeout}ms.`
                    : stderr,
            exitCode: timedOut ? 124 : execution.exitCode,
            duration: Date.now() - startedAt,
            status:
                execution.exitCode === 0
                    ? 'success'
                    : timedOut
                      ? 'timeout'
                      : 'error',
            provider: 'vercel-sandbox',
        };
    } finally {
        await sandbox.stop().catch(() => {});
    }
};

module.exports = {
    EXECUTABLE_LANGUAGES,
    executionSpec,
    runInVercelSandbox,
};
