import React from 'react';

const BrandLogo = ({ className = '' }) => (
    <span className={`inline-flex justify-center ${className}`}>
        <img
            className="h-auto w-full object-contain brightness-[0.68] saturate-150 dark:brightness-100 dark:saturate-100"
            src="/code-sync-transparent.png"
            alt="Code Sync"
        />
    </span>
);

export default BrandLogo;
