const {
    executionSpec,
    runInVercelSandbox,
} = require('../../server/sandbox-execution');

const commandResult = ({
    exitCode = 0,
    stdout = '',
    stderr = '',
} = {}) => ({
    exitCode,
    stdout: jest.fn().mockResolvedValue(stdout),
    stderr: jest.fn().mockResolvedValue(stderr),
});

const createSandboxMock = (results, files = {}) => {
    const sandbox = {
        fs: {
            mkdir: jest.fn().mockResolvedValue(undefined),
            writeFile: jest.fn().mockResolvedValue(undefined),
            readFile: jest.fn((path) =>
                Promise.resolve(files[path] || '')
            ),
        },
        runCommand: jest.fn(),
        stop: jest.fn().mockResolvedValue(undefined),
    };
    results.forEach((result) =>
        sandbox.runCommand.mockResolvedValueOnce(commandResult(result))
    );
    const SandboxClass = {
        create: jest.fn().mockResolvedValue(sandbox),
    };
    return { SandboxClass, sandbox };
};

test('derives a safe Java filename and runtime class from source', () => {
    expect(
        executionSpec(
            'java',
            'package dev.sync; public class Runner { public static void main(String[] args) {} }'
        )
    ).toEqual({
        sourcePath: 'dev/sync/Runner.java',
        compile: [
            'javac',
            [
                '-encoding',
                'UTF-8',
                '-d',
                '.',
                'dev/sync/Runner.java',
            ],
        ],
        run: 'java dev.sync.Runner < stdin.txt',
    });
});

test('compiles and runs Java inside a network-isolated snapshot', async () => {
    const { SandboxClass, sandbox } = createSandboxMock([
        { exitCode: 0 },
        { exitCode: 0 },
    ], {
        'stdout.txt': 'Hello Java\n',
    });

    const output = await runInVercelSandbox(
        {
            language: 'java',
            source:
                'public class Main { public static void main(String[] args) { System.out.println("Hello Java"); } }',
            stdin: '',
            timeout: 4000,
        },
        { SandboxClass, snapshotId: 'snap_test' }
    );

    expect(SandboxClass.create).toHaveBeenCalledWith(
        expect.objectContaining({
            source: { type: 'snapshot', snapshotId: 'snap_test' },
            networkPolicy: 'deny-all',
            persistent: false,
            resources: { vcpus: 1 },
        })
    );
    expect(sandbox.runCommand).toHaveBeenNthCalledWith(
        1,
        'javac',
        ['-encoding', 'UTF-8', '-d', '.', 'Main.java'],
        expect.objectContaining({ timeoutMs: 7000 })
    );
    expect(sandbox.runCommand).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
            cmd: 'bash',
            args: [
                '-lc',
                'ulimit -f 128 -u 64; java Main < stdin.txt > stdout.txt 2> stderr.txt',
            ],
            timeoutMs: 4000,
        })
    );
    expect(output).toMatchObject({
        stdout: 'Hello Java\n',
        exitCode: 0,
        status: 'success',
        provider: 'vercel-sandbox',
    });
    expect(sandbox.stop).toHaveBeenCalled();
});

test('returns compiler diagnostics and still destroys the sandbox', async () => {
    const { SandboxClass, sandbox } = createSandboxMock([
        { exitCode: 1, stderr: 'main.cpp: error: expected ;' },
    ]);

    const output = await runInVercelSandbox(
        {
            language: 'cpp',
            source: 'int main() { return 0 }',
            stdin: '',
            timeout: 4000,
        },
        { SandboxClass, snapshotId: 'snap_test' }
    );

    expect(output).toMatchObject({
        stderr: 'main.cpp: error: expected ;',
        exitCode: 1,
        status: 'error',
    });
    expect(sandbox.stop).toHaveBeenCalled();
});

test('runs SQL against an ephemeral SQLite database', async () => {
    const { SandboxClass, sandbox } = createSandboxMock(
        [{ exitCode: 0 }],
        {
            'stdout.txt': 'answer\n------\n42\n',
        }
    );

    const output = await runInVercelSandbox(
        {
            language: 'sql',
            source: 'SELECT 42 AS answer;',
            stdin: '',
            timeout: 4000,
        },
        { SandboxClass, snapshotId: 'snap_test' }
    );

    expect(sandbox.fs.writeFile).toHaveBeenCalledWith(
        'main.sql',
        'SELECT 42 AS answer;'
    );
    expect(sandbox.fs.writeFile).toHaveBeenCalledWith(
        'sql-runner.py',
        expect.stringContaining('sqlite3.connect(":memory:")')
    );
    expect(output).toMatchObject({
        stdout: 'answer\n------\n42\n',
        exitCode: 0,
        status: 'success',
    });
});

test('normalizes sandbox termination into a useful timeout result', async () => {
    const { SandboxClass, sandbox } = createSandboxMock(
        [{ exitCode: 137 }],
        {
            'stdout.txt': '',
            'stderr.txt': '',
        }
    );

    const output = await runInVercelSandbox(
        {
            language: 'python',
            source: 'while True: pass',
            stdin: '',
            timeout: 1000,
        },
        { SandboxClass, snapshotId: 'snap_test' }
    );

    expect(output).toMatchObject({
        stderr: 'Execution timed out after 1000ms.',
        exitCode: 124,
        status: 'timeout',
    });
    expect(sandbox.stop).toHaveBeenCalled();
});
