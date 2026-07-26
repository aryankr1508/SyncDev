import { useEffect } from 'react';

const closeDetails = (details) => {
    details.forEach((element) => element.removeAttribute('open'));
};

const useDismissOpenDetails = () => {
    useEffect(() => {
        const handlePointerDown = (event) => {
            const openDetails = Array.from(
                document.querySelectorAll('details[open]')
            );

            closeDetails(
                openDetails.filter((element) => !element.contains(event.target))
            );
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeDetails(
                    Array.from(document.querySelectorAll('details[open]'))
                );
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);
};

export default useDismissOpenDetails;
