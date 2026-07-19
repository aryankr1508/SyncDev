import React, { useRef } from 'react';

const resolveLimit = (limit) =>
    typeof limit === 'function' ? limit() : limit;

const VerticalResizeHandle = ({
    ariaLabel,
    currentHeight,
    direction = 1,
    minHeight,
    maxHeight,
    onResize,
    onReset,
}) => {
    const dragRef = useRef(null);

    const clampHeight = (height) =>
        Math.min(
            resolveLimit(maxHeight),
            Math.max(resolveLimit(minHeight), height)
        );

    const resizeTo = (height) => onResize(clampHeight(height));

    const beginResize = (event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startHeight: currentHeight(),
        };
    };

    const continueResize = (event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        const distance = event.clientY - dragRef.current.startY;
        resizeTo(dragRef.current.startHeight + distance * direction);
    };

    const finishResize = (event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Home' && onReset) {
            event.preventDefault();
            onReset();
            return;
        }

        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        const distance = event.key === 'ArrowDown' ? 24 : -24;
        resizeTo(currentHeight() + distance * direction);
    };

    return (
        <div
            role="separator"
            aria-label={ariaLabel}
            aria-orientation="horizontal"
            tabIndex="0"
            title="Drag to resize. Use arrow keys for precise control."
            onDoubleClick={onReset}
            onKeyDown={handleKeyDown}
            onPointerDown={beginResize}
            onPointerMove={continueResize}
            onPointerUp={finishResize}
            onPointerCancel={finishResize}
            className="group flex h-2 shrink-0 touch-none cursor-ns-resize select-none items-center justify-center bg-slate-100 outline-none transition-colors hover:bg-sync/15 focus:bg-sync/15 dark:bg-white/[0.04]"
        >
            <span className="h-0.5 w-12 rounded-full bg-slate-300 transition-all group-hover:w-16 group-hover:bg-sync group-focus:w-16 group-focus:bg-sync dark:bg-white/20" />
        </div>
    );
};

export default VerticalResizeHandle;
