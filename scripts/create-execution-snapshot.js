/* eslint-disable no-console */
const REQUIRED_COMMANDS = ['java', 'javac', 'python3', 'gcc', 'g++'];
const PACKAGES = [
    'java-21-amazon-corretto-devel',
    'python3',
    'gcc',
    'gcc-c++',
];

const run = async () => {
    const { Sandbox } = await import('@vercel/sandbox');
    const sandbox = await Sandbox.create({
        runtime: 'node24',
        timeout: 10 * 60 * 1000,
        resources: { vcpus: 1 },
        networkPolicy: 'allow-all',
        tags: { purpose: 'syncdev-runtimes' },
    });

    try {
        const install = await sandbox.runCommand({
            cmd: 'dnf',
            args: ['install', '-y', ...PACKAGES],
            sudo: true,
            timeoutMs: 8 * 60 * 1000,
        });
        const installError = await install.stderr();
        if (install.exitCode !== 0) {
            throw new Error(
                installError || 'Could not install execution runtimes.'
            );
        }

        const verify = await sandbox.runCommand({
            cmd: 'bash',
            args: [
                '-lc',
                `${REQUIRED_COMMANDS.map(
                    (command) => `command -v ${command}`
                ).join(' && ')}`,
            ],
            timeoutMs: 15000,
        });
        if (verify.exitCode !== 0) {
            throw new Error(
                (await verify.stderr()) ||
                    'One or more execution runtimes are unavailable.'
            );
        }

        const snapshot = await sandbox.snapshot({ expiration: 0 });
        console.log(
            JSON.stringify({
                snapshotId: snapshot.snapshotId,
                runtimes: REQUIRED_COMMANDS,
            })
        );
    } catch (error) {
        await sandbox.stop().catch(() => {});
        throw error;
    }
};

run().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
