import React from 'react';

const Icon = ({ children, className = 'h-4 w-4', viewBox = '0 0 20 20' }) => (
    <svg className={className} viewBox={viewBox} fill="none" aria-hidden="true">
        {children}
    </svg>
);

export const CopyIcon = ({ className }) => (
    <Icon className={className}>
        <rect x="6" y="6" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13 6V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1" stroke="currentColor" strokeWidth="1.6" />
    </Icon>
);

export const UserIcon = ({ className }) => (
    <Icon className={className}>
        <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4.5 16c.7-3 2.5-4.5 5.5-4.5s4.8 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Icon>
);

export const ArrowRightIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
);

export const PlusIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
);

export const ShieldIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M10 2.5 16 5v4.5c0 3.7-2.5 6.3-6 8-3.5-1.7-6-4.3-6-8V5l6-2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="m7.5 10.5 1.5 1.5 3.5-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
);

export const ExitIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8M12 6l4 4-4 4m4-4H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
);

export const ChevronIcon = ({ className }) => (
    <Icon className={className}>
        <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
);

export const SunIcon = ({ className }) => (
    <Icon className={className}>
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2v2m0 12v2M2 10h2m12 0h2M4.3 4.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Icon>
);

export const MoonIcon = ({ className }) => (
    <Icon className={className}>
        <path d="M16.2 12.5A6.5 6.5 0 0 1 7.5 3.8 6.5 6.5 0 1 0 16.2 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </Icon>
);

export const CodeIcon = ({ className }) => (
    <Icon className={className}>
        <path d="m7.5 5-5 5 5 5M12.5 5l5 5-5 5M11.5 3 8.7 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
);

export const SettingsIcon = ({ className }) => (
    <Icon className={className}>
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8.6 2.7h2.8l.5 2a6 6 0 0 1 1.2.7l2-.6 1.4 2.4-1.5 1.4a6 6 0 0 1 0 1.4l1.5 1.4-1.4 2.4-2-.6a6 6 0 0 1-1.2.7l-.5 2H8.6l-.5-2a6 6 0 0 1-1.2-.7l-2 .6-1.4-2.4L5 10a6 6 0 0 1 0-1.4L3.5 7.2l1.4-2.4 2 .6a6 6 0 0 1 1.2-.7l.5-2Z" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
);

export const PlayIcon = ({ className }) => (
    <Icon className={className}>
        <path d="m7 5 8 5-8 5V5Z" fill="currentColor" />
    </Icon>
);

export const ActivityIcon = ({ className }) => (
    <Icon className={className} viewBox="0 0 64 20">
        <path d="M1 12h10l4-8 5 13 6-10 5 7 5-4 5 4 4-9 5 11 4-6h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
);
