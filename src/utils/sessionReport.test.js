import { createSessionReport } from './sessionReport';

test('creates an evidence report without exposing hidden test data', () => {
    const report = createSessionReport({
        roomId: 'room-1',
        clients: [{ username: 'Aryan', role: 'host' }],
        session: {
            mode: 'interview',
            revision: 'revision-2',
            events: [
                {
                    id: 'event-1',
                    type: 'checkpoint',
                    revision: 'revision-1',
                    actorName: 'Aryan',
                    createdAt: '2026-07-26T10:00:00.000Z',
                    metadata: {
                        title: 'Working solution',
                        note: 'Validated the edge case',
                    },
                },
                {
                    id: 'event-2',
                    type: 'test-run',
                    revision: 'revision-2',
                    actorName: 'Aryan',
                    createdAt: '2026-07-26T10:01:00.000Z',
                    metadata: {
                        total: 3,
                        passed: 3,
                        hiddenInput: 'must-not-appear',
                    },
                },
            ],
        },
    });

    expect(report).toContain('SyncDev session report');
    expect(report).toContain('Assess reasoning, correctness, and communication.');
    expect(report).toContain('## Interview outcome');
    expect(report).toContain('Working solution');
    expect(report).toContain('3 tests — 3 passed');
    expect(report).not.toContain('must-not-appear');
});
