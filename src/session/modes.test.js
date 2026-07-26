import {
    getModeExperience,
    getModeThemeStyle,
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
        expect(MODE_EXPERIENCES[mode].missionPrompt).toBeTruthy();
        expect(MODE_EXPERIENCES[mode].focusPoints).toHaveLength(3);
        expect(MODE_EXPERIENCES[mode].editorPlaceholder).toBeTruthy();
        expect(MODE_EXPERIENCES[mode].runLabel).toBeTruthy();
        expect(MODE_EXPERIENCES[mode].outputTitle).toBeTruthy();
        expect(MODE_EXPERIENCES[mode].accent).toMatch(/^#/);
    });

    expect(
        new Set(MODE_IDS.map((mode) => MODE_EXPERIENCES[mode].accent)).size
    ).toBe(3);
    expect(
        new Set(MODE_IDS.map((mode) => MODE_EXPERIENCES[mode].motif)).size
    ).toBe(3);
    expect(
        new Set(MODE_IDS.map((mode) => MODE_EXPERIENCES[mode].runLabel)).size
    ).toBe(3);
});

test('provides reusable light and dark visual tokens for a room mode', () => {
    expect(getModeThemeStyle('training')).toEqual({
        '--mode-accent-light': '#0284c7',
        '--mode-accent-dark': '#38bdf8',
        '--mode-accent-rgb-light': '2 132 199',
        '--mode-accent-rgb-dark': '56 189 248',
    });
});

test('falls back safely to the interview experience', () => {
    expect(getModeExperience('unsupported')).toBe(
        MODE_EXPERIENCES.interview
    );
});
