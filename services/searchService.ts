import { Person } from '../types';

export interface SemanticSearchResult {
    person: Person;
    relationDescription: string;
}

const RELATION_KEYWORDS = {
    hijo: ['HIJO', 'HIJOS', 'HIJA', 'HIJAS', 'DESCENDIENTES'],
    padre: ['PADRE', 'MADRE', 'PADRES', 'PROGENITORES', 'PAPA', 'MAMA'],
    hermano: ['HERMANO', 'HERMANA', 'HERMANOS', 'HERMANAS'],
    pareja: ['PAREJA', 'ESPOSO', 'ESPOSA', 'CONYUGE', 'MARIDO', 'MUJER', 'NOVIO', 'NOVIA'],
    abuelo: ['ABUELO', 'ABUELA', 'ABUELOS', 'ABUELAS'],
    nieto: ['NIETO', 'NIETA', 'NIETOS', 'NIETAS'],
    primo: ['PRIMO', 'PRIMA', 'PRIMOS', 'PRIMAS'],
    tio: ['TIO', 'TIA', 'TIOS', 'TIAS'],
    sobrino: ['SOBRINO', 'SOBRINA', 'SOBRINOS', 'SOBRINAS'],
};

export const searchSemantically = (
    query: string,
    people: Person[]
): SemanticSearchResult[] => {
    const upperQuery = query.toUpperCase().trim();

    // Pattern: [RELACION] DE [NOMBRE]
    // Matches "hijo de alejandro", "padres de juan perez", etc.
    const match = upperQuery.match(/^(.+)\s+DE\s+(.+)$/);
    if (!match) return [];

    const relQuery = match[1].trim();
    const nameQuery = match[2].trim();

    // 1. Find the target person (X)
    const targetX = people.find(p =>
        p.name.toUpperCase().includes(nameQuery) ||
        p.surnames.toUpperCase().includes(nameQuery) ||
        `${p.name} ${p.surnames}`.toUpperCase().includes(nameQuery)
    );

    if (!targetX) return [];

    // Helper to get person by ID
    const getP = (id: string) => people.find(p => p.id === id);

    // 2. Identify relationship type
    let foundRelation = '';
    for (const [key, keywords] of Object.entries(RELATION_KEYWORDS)) {
        if (keywords.some(k => relQuery.includes(k))) {
            foundRelation = key;
            break;
        }
    }

    if (!foundRelation) return [];

    const results: SemanticSearchResult[] = [];

    const add = (p: Person | undefined, desc: string) => {
        if (p && !results.some(r => r.person.id === p.id)) {
            results.push({ person: p, relationDescription: desc });
        }
    };

    const xName = targetX.name.split(' ')[0];

    switch (foundRelation) {
        case 'hijo':
            targetX.children.forEach(id => add(getP(id), `Hijo/a de ${xName}`));
            break;
        case 'padre':
            targetX.parents.forEach(id => add(getP(id), `Padre/Madre de ${xName}`));
            break;
        case 'hermano':
            (targetX.siblings || []).forEach(id => add(getP(id), `Hermano/a de ${xName}`));
            break;
        case 'pareja':
            targetX.partners.forEach(id => add(getP(id), `Pareja de ${xName}`));
            break;
        case 'abuelo':
            targetX.parents.forEach(pId => {
                const parent = getP(pId);
                parent?.parents.forEach(gId => add(getP(gId), `Abuelo/a de ${xName}`));
            });
            break;
        case 'nieto':
            targetX.children.forEach(cId => {
                const child = getP(cId);
                child?.children.forEach(gcId => add(getP(gcId), `Nieto/a de ${xName}`));
            });
            break;
        case 'primo':
            // Hijos de los hermanos de los padres
            targetX.parents.forEach(pId => {
                const parent = getP(pId);
                if (parent) {
                    (parent.siblings || []).forEach(psId => {
                        const uncle = getP(psId);
                        uncle?.children.forEach(cousinId => add(getP(cousinId), `Primo/a de ${xName}`));
                    });
                }
            });
            break;
        case 'tio':
            targetX.parents.forEach(pId => {
                const parent = getP(pId);
                if (parent) {
                    (parent.siblings || []).forEach(sId => add(getP(sId), `Tío/a de ${xName}`));
                }
            });
            break;
        case 'sobrino':
            (targetX.siblings || []).forEach(sId => {
                const sibling = getP(sId);
                sibling?.children.forEach(cId => add(getP(cId), `Sobrino/a de ${xName}`));
            });
            break;
    }

    return results;
};
