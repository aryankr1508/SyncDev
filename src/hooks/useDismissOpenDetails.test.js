import { fireEvent, render, screen } from '@testing-library/react';
import useDismissOpenDetails from './useDismissOpenDetails';

const DetailsFixture = () => {
    useDismissOpenDetails();

    return (
        <div>
            <details open>
                <summary>Theme</summary>
                <button type="button">Theme option</button>
            </details>
            <details open>
                <summary>Run options</summary>
                <button type="button">Run option</button>
            </details>
            <button type="button">Outside</button>
        </div>
    );
};

test('closes open dropdowns when clicking outside them', () => {
    render(<DetailsFixture />);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));

    expect(screen.getByText('Theme').closest('details')).not.toHaveAttribute(
        'open'
    );
    expect(
        screen.getByText('Run options').closest('details')
    ).not.toHaveAttribute('open');
});

test('keeps the clicked dropdown open and closes other dropdowns', () => {
    render(<DetailsFixture />);

    fireEvent.pointerDown(
        screen.getByRole('button', { name: 'Theme option' })
    );

    expect(screen.getByText('Theme').closest('details')).toHaveAttribute(
        'open'
    );
    expect(
        screen.getByText('Run options').closest('details')
    ).not.toHaveAttribute('open');
});

test('closes all open dropdowns with Escape', () => {
    render(<DetailsFixture />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(document.querySelectorAll('details[open]')).toHaveLength(0);
});
