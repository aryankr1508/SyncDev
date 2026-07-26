const {
    LIMITS,
    canEdit,
    cleanRunMetadata,
    hashSecret,
    isSafeId,
    safeSecretMatch,
    snapshotCode,
} = require('../../server/session-protocol');

describe('shared session protocol', () => {
    test('accepts URL-safe identifiers and rejects unsafe values', () => {
        expect(isSafeId('room_42-alpha')).toBe(true);
        expect(isSafeId('room/42')).toBe(false);
        expect(isSafeId('')).toBe(false);
    });

    test('enforces role and room editing policies', () => {
        expect(canEdit('host', 'host-only')).toBe(true);
        expect(canEdit('participant', 'everyone')).toBe(true);
        expect(canEdit('participant', 'host-only')).toBe(false);
        expect(canEdit('observer', 'everyone')).toBe(false);
    });

    test('compares hashed room credentials without storing the secret', () => {
        const expectedHash = hashSecret('private-host-key');
        expect(safeSecretMatch('private-host-key', expectedHash)).toBe(true);
        expect(safeSecretMatch('wrong-key', expectedHash)).toBe(false);
    });

    test('bounds replay snapshots and exported run metadata', () => {
        expect(snapshotCode('const value = 1;')).toBe('const value = 1;');
        expect(snapshotCode('x'.repeat(LIMITS.eventCode + 1))).toBe('');

        expect(
            cleanRunMetadata({
                language: 'javascript',
                status: 'passed',
                duration: -8,
                stdout: 'done',
                total: 3,
                passed: 2,
            })
        ).toEqual({
            language: 'javascript',
            status: 'passed',
            exitCode: null,
            duration: 0,
            stdout: 'done',
            stderr: '',
            total: 3,
            passed: 2,
        });
    });
});
