import React from 'react';
import { motion } from 'framer-motion';
import { useFamilyStore } from '../store/familyStore';

const LogoSVG = () => (
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect x="0" y="0" width="512" height="512" rx="100" fill="#11130c" />
        <g stroke="#D1E0C4" stroke-width="30" stroke-linecap="round">
            <line x1="256" y1="130" x2="160" y2="250" />
            <line x1="256" y1="130" x2="352" y2="250" />
            <line x1="160" y1="250" x2="100" y2="370" />
            <line x1="160" y1="250" x2="200" y2="370" />
            <line x1="352" y1="250" x2="312" y2="370" />
            <line x1="352" y1="250" x2="412" y2="370" />
        </g>
        <g fill="#6C8DA0">
            <circle cx="100" cy="370" r="45" />
            <circle cx="200" cy="370" r="45" />
            <circle cx="312" cy="370" r="45" />
            <circle cx="412" cy="370" r="45" />
        </g>
        <g fill="#D1E0C4">
            <circle cx="160" cy="250" r="50" />
            <circle cx="352" cy="250" r="50" />
        </g>
        <circle cx="256" cy="130" r="55" fill="#406355" stroke="#D1E0C4" stroke-width="30" />
    </svg>
);

export const HomeButton: React.FC = () => {
    const setFocusId = useFamilyStore(s => s.setFocusId);
    const people = useFamilyStore(s => s.people);

    if (people.length === 0) return null;

    return (
        <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFocusId('')}
            className="fixed top-4 left-4 z-50 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 backdrop-blur-md"
            title="Ir al inicio / Vista general"
        >
            <LogoSVG />
        </motion.button>
    );
};
