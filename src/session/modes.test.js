import {
    getModeExperience,
    MODE_EXPERIENCES,
    MODE_IDS,
} from './modes';

test('defines a distinct guided workflow for every supported room mode', () => {
    expect(MODE_IDS).toEqual(['interview', 'training', 'debugging']);

    const workflows = MODE_IDS.map((mode) =>
        MODE_EXPERIENCES[mode].workflow.join(' → ')
    );
    expect(new Set(workflows).size).toBe(3);
    MODE_IDS.forEach((mode) => {
        expect(MODE_EXPERIENCES[mode].description).toBeTruthy();
        expect(MODE_EXPERIENCES[mode].checkpointAction).toBeTruthy();
        expect(MODE_EXPERIENCES[mode].reportTitle).toBeTruthy();
    });
});

test('falls back safely to the interview experience', () => {
    expect(getModeExperience('unsupported')).toBe(
        MODE_EXPERIENCES.interview
    );
});
