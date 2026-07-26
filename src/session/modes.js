export const MODE_EXPERIENCES = Object.freeze({
    interview: {
        id: 'interview',
        shortLabel: 'Interview',
        label: 'Technical interview',
        purpose: 'Evaluate problem-solving',
        description:
            'Observe how a candidate reasons, iterates, and validates a solution—not only their final code.',
        workspaceTitle: 'Interview workspace',
        workspaceGoal: 'Assess reasoning, correctness, and communication.',
        liveStatus: 'Candidate evidence syncs automatically',
        workflow: ['Brief', 'Observe', 'Evaluate', 'Review'],
        timelineTab: 'Attempts',
        testsTab: 'Evaluation',
        reportTab: 'Review',
        checkpointAction: 'Capture a candidate milestone',
        checkpointTitlePlaceholder: 'Approach, breakthrough, or final solution',
        checkpointNotePlaceholder:
            'What did the candidate reason about or decide?',
        emptyTimeline:
            'Candidate attempts, runs, and milestones will build the interview evidence here.',
        testsTitle: 'Candidate evaluation',
        testsDescription:
            'Use visible examples for clarity and hidden cases for unbiased edge-case validation.',
        addTestTitle: 'Add interview case',
        testLabelPlaceholder: 'Requirement or edge case',
        hiddenTestLabel:
            'Keep this case private from the candidate',
        reportTitle: 'Candidate evidence report',
        reportDescription:
            'Export attempts, milestones, validation results, and participation without hidden test data.',
        outcomeHeading: 'Interview outcome',
    },
    training: {
        id: 'training',
        shortLabel: 'Training',
        label: 'Training session',
        purpose: 'Teach through practice',
        description:
            'Guide learners through explanation, hands-on exercises, feedback, and a reusable progress recap.',
        workspaceTitle: 'Learning workspace',
        workspaceGoal: 'Explain, practise, review, and reinforce.',
        liveStatus: 'Learning progress syncs automatically',
        workflow: ['Explain', 'Practise', 'Feedback', 'Recap'],
        timelineTab: 'Progress',
        testsTab: 'Exercises',
        reportTab: 'Recap',
        checkpointAction: 'Mark a learning milestone',
        checkpointTitlePlaceholder: 'Concept or exercise completed',
        checkpointNotePlaceholder:
            'What did the learner understand or still need help with?',
        emptyTimeline:
            'Exercises, explanations, and learning milestones will form a progress trail here.',
        testsTitle: 'Practice exercises',
        testsDescription:
            'Use clear, visible examples for guided practice and optional private checks for mastery.',
        addTestTitle: 'Add practice exercise',
        testLabelPlaceholder: 'Exercise objective',
        hiddenTestLabel:
            'Keep this mastery check private from learners',
        reportTitle: 'Learning progress recap',
        reportDescription:
            'Export concepts covered, exercises, milestones, and the latest learning outcome.',
        outcomeHeading: 'Learning outcome',
    },
    debugging: {
        id: 'debugging',
        shortLabel: 'Debugging',
        label: 'Debugging room',
        purpose: 'Resolve issues systematically',
        description:
            'Preserve reproduction steps, hypotheses, attempted fixes, and proof that the final change works.',
        workspaceTitle: 'Debugging workspace',
        workspaceGoal: 'Reproduce, diagnose, fix, and verify.',
        liveStatus: 'Investigation evidence syncs automatically',
        workflow: ['Reproduce', 'Hypothesise', 'Fix', 'Verify'],
        timelineTab: 'Investigation',
        testsTab: 'Verification',
        reportTab: 'Resolution',
        checkpointAction: 'Record an investigation finding',
        checkpointTitlePlaceholder: 'Symptom, hypothesis, root cause, or fix',
        checkpointNotePlaceholder:
            'What evidence supports this finding or decision?',
        emptyTimeline:
            'Reproductions, hypotheses, attempted fixes, and verification runs will appear here.',
        testsTitle: 'Regression verification',
        testsDescription:
            'Capture the failing reproduction first, then prove the fix without reopening the bug.',
        addTestTitle: 'Add reproduction or regression check',
        testLabelPlaceholder: 'Failure scenario or regression',
        hiddenTestLabel:
            'Keep this diagnostic case private from participants',
        reportTitle: 'Incident resolution report',
        reportDescription:
            'Export symptoms, hypotheses, attempted fixes, root cause, and verification evidence.',
        outcomeHeading: 'Resolution',
    },
});

export const MODE_IDS = Object.keys(MODE_EXPERIENCES);

export const getModeExperience = (mode) =>
    MODE_EXPERIENCES[mode] || MODE_EXPERIENCES.interview;
