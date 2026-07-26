const { createHash, randomUUID, timingSafeEqual } = require('crypto');

const LIMITS = Object.freeze({
    roomId: 128,
    username: 32,
    clientId: 100,
    token: 256,
    code: 500000,
    eventCode: 100000,
    events: 80,
    tests: 40,
});

const ROOM_RETENTION_DAYS = 7;
const MODES = new Set(['interview', 'training', 'debugging']);
const ROLES = new Set(['host', 'participant', 'observer']);
const ASSIGNABLE_ROLES = new Set(['participant', 'observer']);
const EDIT_POLICIES = new Set(['everyone', 'host-only']);

const normalize = (value, limit) => String(value || '').trim().slice(0, limit);
const isSafeId = (value) => /^[A-Za-z0-9_-]+$/.test(value);
const hashSecret = (value) =>
    createHash('sha256').update(String(value || '')).digest('hex');
const createId = () =>
    typeof randomUUID === 'function'
        ? randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const createExpiry = () =>
    new Date(
        Date.now() + ROOM_RETENTION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

const safeSecretMatch = (value, expectedHash) => {
    if (!value || !expectedHash) return false;
    const actual = Buffer.from(hashSecret(value));
    const expected = Buffer.from(String(expectedHash));
    return (
        actual.length === expected.length && timingSafeEqual(actual, expected)
    );
};

const isEditorRole = (role) => role === 'host' || role === 'participant';

const canEdit = (role, editPolicy) =>
    isEditorRole(role) &&
    (editPolicy !== 'host-only' || role === 'host');

const snapshotCode = (code) =>
    typeof code === 'string' && code.length <= LIMITS.eventCode ? code : '';

const cleanRunMetadata = (input = {}) => ({
    language: normalize(input.language, 40),
    status: normalize(input.status, 20),
    exitCode: Number.isInteger(input.exitCode) ? input.exitCode : null,
    duration: Number.isFinite(Number(input.duration))
        ? Math.max(0, Number(input.duration))
        : null,
    stdout: String(input.stdout || '').slice(0, 5000),
    stderr: String(input.stderr || '').slice(0, 5000),
    total: Math.max(0, Number(input.total) || 0),
    passed: Math.max(0, Number(input.passed) || 0),
});

module.exports = {
    ASSIGNABLE_ROLES,
    EDIT_POLICIES,
    LIMITS,
    MODES,
    ROLES,
    ROOM_RETENTION_DAYS,
    canEdit,
    cleanRunMetadata,
    createExpiry,
    createId,
    hashSecret,
    isEditorRole,
    isSafeId,
    normalize,
    safeSecretMatch,
    snapshotCode,
};
