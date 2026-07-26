const clean = (value, fallback = '') =>
    String(value ?? fallback).replace(/\r\n/g, '\n').trim();

const formatTime = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Unknown time'
        : date.toLocaleString();
};

const eventSummary = (event) => {
    const actor = clean(event.actorName, 'Unknown participant');
    const metadata = event.metadata || {};

    switch (event.type) {
        case 'checkpoint':
            return `Checkpoint “${clean(metadata.title, 'Untitled')}” created by ${actor}`;
        case 'restore':
            return `${actor} restored revision ${clean(
                metadata.restoredRevision,
                event.revision
            )}`;
        case 'run':
            return `${actor} ran ${clean(metadata.language, 'code')} — ${
                metadata.status || 'completed'
            }${Number.isFinite(metadata.duration) ? ` in ${metadata.duration}ms` : ''}`;
        case 'test-run':
            return `${actor} ran ${Number(metadata.total) || 0} tests — ${
                Number(metadata.passed) || 0
            } passed`;
        case 'settings':
            return `${actor} updated room controls`;
        case 'role':
            return `${actor} changed ${clean(metadata.username, 'a participant')} to ${clean(
                metadata.role,
                'participant'
            )}`;
        case 'code':
            return `${actor} saved revision ${clean(event.revision, 'unknown')}`;
        default:
            return `${actor} recorded ${clean(event.type, 'an event')}`;
    }
};

export const createSessionReport = ({
    roomId,
    session,
    clients = [],
} = {}) => {
    const events = Array.isArray(session?.events) ? session.events : [];
    const checkpoints = events.filter((event) => event.type === 'checkpoint');
    const runs = events.filter(
        (event) => event.type === 'run' || event.type === 'test-run'
    );
    const participants = new Map();

    clients.forEach((client) => {
        participants.set(client.username, client.role || 'participant');
    });
    events.forEach((event) => {
        if (event.actorName) {
            participants.set(
                event.actorName,
                participants.get(event.actorName) || 'participant'
            );
        }
    });

    const lines = [
        '# SyncDev session report',
        '',
        `- Room: \`${clean(roomId, 'unknown')}\``,
        `- Mode: ${clean(session?.mode, 'interview')}`,
        `- Generated: ${new Date().toLocaleString()}`,
        `- Current revision: \`${clean(session?.revision, 'none')}\``,
        `- Checkpoints: ${checkpoints.length}`,
        `- Recorded runs: ${runs.length}`,
        '',
        '## Participants',
        '',
    ];

    if (participants.size === 0) {
        lines.push('- No participant information recorded.');
    } else {
        Array.from(participants.entries()).forEach(([username, role]) => {
            lines.push(`- ${username} — ${role}`);
        });
    }

    lines.push('', '## Session timeline', '');
    if (events.length === 0) {
        lines.push('- No session events recorded.');
    } else {
        events.forEach((event) => {
            lines.push(`- ${formatTime(event.createdAt)} — ${eventSummary(event)}`);
            if (event.type === 'checkpoint' && clean(event.metadata?.note)) {
                lines.push(`  - Intent: ${clean(event.metadata.note)}`);
            }
        });
    }

    lines.push('', '## Outcome', '');
    const latestCheckpoint = checkpoints[checkpoints.length - 1];
    if (latestCheckpoint) {
        lines.push(
            `Latest checkpoint: **${clean(
                latestCheckpoint.metadata?.title,
                'Untitled'
            )}** at revision \`${clean(latestCheckpoint.revision, 'unknown')}\`.`
        );
    } else {
        lines.push('No final checkpoint was marked during this session.');
    }

    lines.push(
        '',
        '> This report contains collaboration evidence recorded by SyncDev. Hidden test inputs and expected outputs are intentionally excluded.',
        ''
    );

    return lines.join('\n');
};

export const downloadSessionReport = (report, roomId) => {
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `syncdev-${clean(roomId, 'session')}-report.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
};
