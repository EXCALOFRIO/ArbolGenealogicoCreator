import React, { useState, useEffect } from 'react';
import { useFamilyStore } from '../store/familyStore';

export const DebugControls: React.FC = () => {
    const { importRelationships, setFocusId } = useFamilyStore();
    const [isVisible, setIsVisible] = useState(false);

    // Comando secreto: Ctrl+Shift+D para mostrar/ocultar los controles de debug
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                setIsVisible(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const loadDemoFamily = () => {
        // Escenario: Josefina (Foco) -> Hijo: Rafael. Rafael -> Pareja: Raquel. Raquel -> Padres: Papá/Mamá Raquel (Consuegros)
        const demoData: any = {
            version: 2,
            focusId: 'josefina',
            people: {
                'josefina': { name: 'JOSEFINA', surnames: 'GARCIA', gender: 'Female' },
                'rafael': { name: 'RAFAEL', surnames: 'GARCIA PEREZ', gender: 'Male' },
                'raquel': { name: 'RAQUEL', surnames: 'PEREZ', gender: 'Female' },
                'papa-raquel': { name: 'PAPA RAQUEL', surnames: 'PEREZ', gender: 'Male' },
                'mama-raquel': { name: 'MAMA RAQUEL', surnames: 'LOPEZ', gender: 'Female' },
            },
            relationships: {
                'josefina': { parents: [], partners: [], children: ['rafael'], siblings: [] },
                'rafael': { parents: ['josefina'], partners: ['raquel'], children: [], siblings: [] },
                'raquel': { parents: ['papa-raquel', 'mama-raquel'], partners: ['rafael'], children: [], siblings: [] },
                'papa-raquel': { parents: [], partners: ['mama-raquel'], children: ['raquel'], siblings: [] },
                'mama-raquel': { parents: [], partners: ['papa-raquel'], children: ['raquel'], siblings: [] },
            }
        };

        importRelationships(demoData);
        setFocusId('josefina');
    };

    const loadSuperFamily = () => {
        const data: any = {
            version: 2,
            focusId: 'me',
            people: {
                // Gen -4: Tatarabuelos
                'tatara1': { name: 'FERNANDO', surnames: 'RAMIREZ', gender: 'Male' },
                'tatara2': { name: 'ISABEL', surnames: 'LOPEZ', gender: 'Female' },
                // Gen -3: Bisabuelos
                'bis1': { name: 'ANTONIO', surnames: 'RAMIREZ LOPEZ', gender: 'Male' },
                'bis2': { name: 'ROSA', surnames: 'GARCIA', gender: 'Female' },
                // Gen -2: Abuelos
                'abuelo-p': { name: 'RAFAEL', surnames: 'RAMIREZ GARCIA', gender: 'Male' },
                'abuela-p': { name: 'JOSEFINA', surnames: 'FERNANDEZ', gender: 'Female' },
                'abuelo-m': { name: 'JUAN', surnames: 'LARENA', gender: 'Male' },
                'abuela-m': { name: 'MARIA', surnames: 'JIMENEZ', gender: 'Female' },
                // Gen -1: Padres y Tíos
                'padre': { name: 'MARCELO', surnames: 'RAMIREZ FERNANDEZ', gender: 'Male' },
                'madre': { name: 'JULIA', surnames: 'LARENA JIMENEZ', gender: 'Female' },
                'tio-m': { name: 'PEDRO', surnames: 'LARENA JIMENEZ', gender: 'Male' },
                'tia-m': { name: 'ANA', surnames: 'LARENA JIMENEZ', gender: 'Female' },
                // Gen 0: Foco, Pareja, Hermanos, Primos
                'me': { name: 'ALEJANDRO', surnames: 'RAMIREZ LARENA', gender: 'Male' },
                'wife': { name: 'RAQUEL', surnames: 'PÉREZ', gender: 'Female' },
                'hermano': { name: 'DAVID', surnames: 'RAMIREZ LARENA', gender: 'Male' },
                'cuñada': { name: 'SIRA', surnames: 'MACHIN', gender: 'Female' },
                'primo': { name: 'LUIS', surnames: 'LARENA', gender: 'Male' },
                // Gen 1: Hijos y Sobrinos
                'hija': { name: 'PATRICIA', surnames: 'RAMIREZ PÉREZ', gender: 'Female' },
                'hijo': { name: 'ALBERTO', surnames: 'RAMIREZ PÉREZ', gender: 'Male' },
                'sobrino': { name: 'MARCOS', surnames: 'RAMIREZ MACHIN', gender: 'Male' },
                // Gen 2: Nietos
                'nieto': { name: 'HUGO', surnames: 'RAMIREZ', gender: 'Male' },
            },
            relationships: {
                'tatara1': { parents: [], partners: ['tatara2'], children: ['bis1'], siblings: [] },
                'tatara2': { parents: [], partners: ['tatara1'], children: ['bis1'], siblings: [] },
                'bis1': { parents: ['tatara1', 'tatara2'], partners: ['bis2'], children: ['abuelo-p'], siblings: [] },
                'bis2': { parents: [], partners: ['bis1'], children: ['abuelo-p'], siblings: [] },
                'abuelo-p': { parents: ['bis1', 'bis2'], partners: ['abuela-p'], children: ['padre'], siblings: [] },
                'abuela-p': { parents: [], partners: ['abuelo-p'], children: ['padre'], siblings: [] },
                'abuelo-m': { parents: [], partners: ['abuela-m'], children: ['madre', 'tio-m', 'tia-m'], siblings: [] },
                'abuela-m': { parents: [], partners: ['abuelo-m'], children: ['madre', 'tio-m', 'tia-m'], siblings: [] },
                'padre': { parents: ['abuelo-p', 'abuela-p'], partners: ['madre'], children: ['me', 'hermano'], siblings: [] },
                'madre': { parents: ['abuelo-m', 'abuela-m'], partners: ['padre'], children: ['me', 'hermano'], siblings: [] },
                'tio-m': { parents: ['abuelo-m', 'abuela-m'], partners: [], children: ['primo'], siblings: [] },
                'tia-m': { parents: ['abuelo-m', 'abuela-m'], partners: [], children: [], siblings: [] },
                'primo': { parents: ['tio-m'], partners: [], children: [], siblings: [] },
                'me': { parents: ['padre', 'madre'], partners: ['wife'], children: ['hija', 'hijo'], siblings: ['hermano'] },
                'wife': { parents: [], partners: ['me'], children: ['hija', 'hijo'], siblings: [] },
                'hermano': { parents: ['padre', 'madre'], partners: ['cuñada'], children: ['sobrino'], siblings: ['me'] },
                'cuñada': { parents: [], partners: ['hermano'], children: ['sobrino'], siblings: [] },
                'hija': { parents: ['me', 'wife'], partners: [], children: [], siblings: ['hijo'] },
                'hijo': { parents: ['me', 'wife'], partners: [], children: ['nieto'], siblings: ['hija'] },
                'sobrino': { parents: ['hermano', 'cuñada'], partners: [], children: [], siblings: [] },
                'nieto': { parents: ['hijo'], partners: [], children: [], siblings: [] },
            }
        };
        importRelationships(data);
        setFocusId('me');
    };

    const loadMegaFamily = () => {
        const people: any = {};
        const relationships: any = {};
        let idCounter = 1;

        const createPerson = (gender: 'Male' | 'Female', name: string) => {
            const id = `mega_${idCounter++}`;
            people[id] = { name, surnames: 'MEGA', gender };
            relationships[id] = { parents: [], partners: [], children: [], siblings: [] };
            return id;
        };

        // Gen 1
        const p1 = createPerson('Male', 'ROOT');
        const p2 = createPerson('Female', 'ROOT_WIFE');
        relationships[p1].partners.push(p2);
        relationships[p2].partners.push(p1);

        let currentCouples = [[p1, p2]];

        // Gen 2, 3, 4
        for (let gen = 2; gen <= 4; gen++) {
            const nextCouples: string[][] = [];
            currentCouples.forEach(([dad, mom], coupleIdx) => {
                const numChildren = gen === 4 ? 4 : 4; // Final gen can have more to reach 100
                const childrenIds: string[] = [];

                for (let i = 0; i < numChildren; i++) {
                    const gender = i % 2 === 0 ? 'Male' : 'Female';
                    const childId = createPerson(gender, `G${gen}_C${coupleIdx}_${i}`);
                    childrenIds.push(childId);
                    relationships[childId].parents = [dad, mom];
                    relationships[dad].children.push(childId);
                    relationships[mom].children.push(childId);

                    // Partner
                    if (gen < 4) {
                        const partnerGender = gender === 'Male' ? 'Female' : 'Male';
                        const partnerId = createPerson(partnerGender, `G${gen}_P${coupleIdx}_${i}`);
                        relationships[childId].partners.push(partnerId);
                        relationships[partnerId].partners.push(childId);
                        nextCouples.push([childId, partnerId].sort() as string[]);
                    }
                }

                // Add siblings
                childrenIds.forEach(cid => {
                    relationships[cid].siblings = childrenIds.filter(id => id !== cid);
                });
            });
            currentCouples = nextCouples;
        }

        importRelationships({ version: 2, focusId: 'mega_1', people, relationships });
        setFocusId('mega_1');
    };

    const loadChaosDemo = () => {
        const data: any = {
            version: 2,
            focusId: 'ana',
            people: {
                'lucas': { name: 'LUCAS', surnames: 'BRANCH A', gender: 'Male' },
                'marta': { name: 'MARTA', surnames: 'BRANCH A', gender: 'Female' },
                'juan': { name: 'JUAN', surnames: 'BRANCH A', gender: 'Male' },
                'partner-x': { name: 'PAREJA X', surnames: 'EXTERNO', gender: 'Female' },
                'julia-jr': { name: 'JULIA JR', surnames: 'BRANCH A', gender: 'Female' },

                'marcelo': { name: 'MARCELO', surnames: 'BRANCH B', gender: 'Male' },
                'julia-m': { name: 'JULIA M', surnames: 'BRANCH B', gender: 'Female' },
                'ana': { name: 'ANA', surnames: 'BRANCH B', gender: 'Female' },
                'roberto': { name: 'ROBERTO', surnames: 'ANA PARTNER 1', gender: 'Male' },
                'carlos': { name: 'CARLOS', surnames: 'ANA PARTNER 2', gender: 'Male' },
                'son-z-ana': { name: 'SON Z', surnames: 'ANA BRANCH', gender: 'Male' },
            },
            relationships: {
                'lucas': { parents: [], partners: ['marta'], children: ['juan'], siblings: [] },
                'marta': { parents: [], partners: ['lucas'], children: ['juan'], siblings: [] },
                'juan': { parents: ['lucas', 'marta'], partners: ['partner-x'], children: ['julia-jr'], siblings: [] },
                'partner-x': { parents: [], partners: ['juan'], children: ['julia-jr'], siblings: [] },
                'julia-jr': { parents: ['juan', 'partner-x'], partners: ['son-z-ana'], children: [], siblings: [] },

                'marcelo': { parents: [], partners: ['julia-m'], children: ['ana'], siblings: [] },
                'julia-m': { parents: [], partners: ['marcelo'], children: ['ana'], siblings: [] },
                'ana': { parents: ['marcelo', 'julia-m'], partners: ['roberto', 'carlos'], children: ['son-z-ana'], siblings: [] },
                'roberto': { parents: [], partners: ['ana'], children: ['son-z-ana'], siblings: [] },
                'carlos': { parents: [], partners: ['ana'], children: [], siblings: [] },
                'son-z-ana': { parents: ['ana', 'roberto'], partners: ['julia-jr'], children: [], siblings: [] },
            }
        };
        importRelationships(data);
        setFocusId('ana');
    };

    const clearTree = () => {
        importRelationships({ version: 2, relationships: {} } as any);
    };

    // Si no está visible, no renderizar nada
    if (!isVisible) return null;

    return (
        <div className="fixed bottom-24 right-6 flex flex-col gap-2 z-[9999]">
            <div style={{ color: 'var(--app-text-muted)' }} className="text-xs text-center mb-1">
                🔧 Modo Debug (Ctrl+Shift+D)
            </div>
            <button
                onClick={loadSuperFamily}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg transition-all"
            >
                🌟 Super Familia
            </button>
            <button
                onClick={loadMegaFamily}
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg transition-all"
            >
                🌌 Mega Familia
            </button>
            <button
                onClick={loadChaosDemo}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg transition-all"
            >
                🌀 Caso Enrevesado
            </button>
            <button
                onClick={loadDemoFamily}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg transition-all"
            >
                🧬 Demo: Consuegros
            </button>
            <button
                onClick={clearTree}
                className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-bold py-2 px-4 rounded-full border border-red-500/30 shadow-lg transition-all"
            >
                🗑️ Limpiar
            </button>
        </div>
    );
};
