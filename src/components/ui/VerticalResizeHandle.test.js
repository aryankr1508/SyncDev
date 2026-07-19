import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import VerticalResizeHandle from './VerticalResizeHandle';

test('supports keyboard resizing and reset', () => {
    const onResize = jest.fn();
    const onReset = jest.fn();

    render(
        <VerticalResizeHandle
            ariaLabel="Resize code editor"
            currentHeight={() => 400}
            minHeight={280}
            maxHeight={500}
            onResize={onResize}
            onReset={onReset}
        />
    );

    const handle = screen.getByRole('separator', {
        name: 'Resize code editor',
    });
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    fireEvent.keyDown(handle, { key: 'Home' });

    expect(onResize).toHaveBeenNthCalledWith(1, 424);
    expect(onResize).toHaveBeenNthCalledWith(2, 376);
    expect(onReset).toHaveBeenCalledTimes(1);
});

test('reverses the resize direction for a top-mounted handle', () => {
    const onResize = jest.fn();

    render(
        <VerticalResizeHandle
            ariaLabel="Resize output panel"
            currentHeight={() => 240}
            direction={-1}
            minHeight={160}
            maxHeight={520}
            onResize={onResize}
        />
    );

    fireEvent.keyDown(
        screen.getByRole('separator', { name: 'Resize output panel' }),
        { key: 'ArrowUp' }
    );

    expect(onResize).toHaveBeenCalledWith(264);
});
