import { useMemo } from 'react';
import { Person, RenderNode } from '../types';
import { useFamilyStore } from '../store/familyStore';

export const useFamilyLogic = () => {
  const { people, focusId, viewRootId, getPerson } = useFamilyStore();

  const familyTree = useMemo(() => {
    const rootId = viewRootId || focusId;
    const focusPerson = getPerson(rootId);
    if (!focusPerson) return [];

    const nodes = new Map<string, RenderNode>();
    const visited = new Set<string>();

    const addNode = (p: Person, generation: number, relation: string) => {
      if (visited.has(p.id)) return;
      visited.add(p.id);
      nodes.set(p.id, { ...p, generation, relationType: relation });
    };

    // 1. Nodo Central (YO)
    addNode(focusPerson, 0, 'Focus');

    // 2. Mis Parejas (Generación 0)
    focusPerson.partners.forEach(id => {
      const p = getPerson(id);
      if (p) addNode(p, 0, 'Partner');
    });

    // Hijos visibles: propios + hijos de mis parejas (para mostrar familia completa del núcleo)
    const visibleChildrenIds = new Set<string>();
    focusPerson.children.forEach(cid => visibleChildrenIds.add(cid));
    focusPerson.partners.forEach(pid => {
      const partner = getPerson(pid);
      if (!partner) return;
      partner.children.forEach(cid => visibleChildrenIds.add(cid));
    });

    // 3. Padres de mi pareja (Suegros) - Generación -1
    focusPerson.partners.forEach(partnerId => {
      const partner = getPerson(partnerId);
      if (partner) {
        const inLawIds = new Set<string>();

        // Padres declarados
        partner.parents.forEach(pid => inLawIds.add(pid));

        // Inferir el otro progenitor desde la pareja del padre/madre declarado
        partner.parents.forEach(inLawId => {
          const inLaw = getPerson(inLawId);
          if (!inLaw) return;

          inLaw.partners.forEach(spouseId => {
            const spouse = getPerson(spouseId);
            if (!spouse) return;

            // Si el suegro/suegra tiene al partner como hijo, asumimos que la pareja también es suegro/suegra
            // (sirve para casos donde solo se guardó un parent en partner.parents)
            const sharesChild = inLaw.children.includes(partnerId) || spouse.children.includes(partnerId);
            if (sharesChild) inLawIds.add(spouseId);
          });
        });

        Array.from(inLawIds).forEach(inLawId => {
          const inLaw = getPerson(inLawId);
          if (inLaw) addNode(inLaw, -1, inLaw.gender === 'Male' ? 'Suegro' : 'Suegra');
        });
      }
    });

    // 4. Hermanos de mi pareja (Cuñados) - Generación 0
    focusPerson.partners.forEach(partnerId => {
      const partner = getPerson(partnerId);
      if (partner) {
        const addInLawSibling = (siblingId: string) => {
          if (siblingId === partnerId) return;
          const sibling = getPerson(siblingId);
          if (sibling) addNode(sibling, 0, 'PartnerSibling');
        };

        partner.parents.forEach(parentId => {
          const parent = getPerson(parentId);
          if (parent) {
            parent.children.forEach(siblingId => {
              if (siblingId !== partnerId) {
                addInLawSibling(siblingId);
              }
            });
          }
        });

        // Si no hay padres (o además), usar siblings directos
        (partner.siblings || []).forEach(addInLawSibling);

        // Reverse siblings: personas que tienen a mi pareja como hermano/a
        people.forEach(p => {
          if (p.id === partnerId) return;
          if ((p.siblings || []).includes(partnerId)) addInLawSibling(p.id);
        });
      }
    });

    // 5. Padres (Generación -1)
    const parents = focusPerson.parents.map(id => getPerson(id)).filter((p): p is Person => !!p);
    parents.forEach(p => addNode(p, -1, 'Parent'));

    // Helper: obtener hermanos de una persona incluso si no hay padres/abuelos
    const collectSiblingsOf = (person: Person): string[] => {
      const out = new Set<string>();

      // A) Por padres compartidos
      (person.parents || []).forEach(parentId => {
        const parent = getPerson(parentId);
        if (!parent) return;
        (parent.children || []).forEach(childId => {
          if (childId !== person.id) out.add(childId);
        });
      });

      // B) Campo siblings directo
      (person.siblings || []).forEach(sibId => {
        if (sibId !== person.id) out.add(sibId);
      });

      // C) Reverse siblings
      people.forEach(p => {
        if (p.id === person.id) return;
        if ((p.siblings || []).includes(person.id)) out.add(p.id);
      });

      // D) Fallback: comparte al menos un parentId
      if ((person.parents || []).length > 0) {
        people.forEach(p => {
          if (p.id === person.id) return;
          if (p.parents?.some(pid => (person.parents || []).includes(pid))) out.add(p.id);
        });
      }

      return Array.from(out);
    };

    // 6. Abuelos (Generación -2)
    parents.forEach(parent => {
      parent.parents.forEach(gpId => {
        const gp = getPerson(gpId);
        if (gp) addNode(gp, -2, 'Grandparent');
      });
    });

    // 6b. Bisabuelos y superiores (Generación -3 en adelante)
    const maxAncestorDepth = 6; // -3 bisabuelo/a, -4 tatarabuelo/a, -5 tatar x2...
    const ancestorQueue: Array<{ person: Person; depth: number }> = [];
    // arrancar desde abuelos (depth=2)
    parents.forEach(parent => {
      parent.parents.forEach(gpId => {
        const gp = getPerson(gpId);
        if (gp) ancestorQueue.push({ person: gp, depth: 2 });
      });
    });

    while (ancestorQueue.length > 0) {
      const { person, depth } = ancestorQueue.shift()!;
      const nextDepth = depth + 1;
      if (nextDepth > maxAncestorDepth) continue;
      person.parents.forEach(pid => {
        const p = getPerson(pid);
        if (!p) return;
        addNode(p, -nextDepth, `Ancestor${nextDepth}`);
        ancestorQueue.push({ person: p, depth: nextDepth });
      });
    }

    // 7. Hermanos (Generación 0)
    // 7a. Hermanos a través de padres comunes
    parents.forEach(parent => {
      parent.children.forEach(childId => {
        if (childId !== rootId) {
          const sibling = getPerson(childId);
          if (sibling) addNode(sibling, 0, 'Sibling');
        }
      });
    });

    // 7b. Hermanos directos - a través del campo siblings (funciona sin padres)
    (focusPerson.siblings || []).forEach(sibId => {
      const sibling = getPerson(sibId);
      if (sibling) addNode(sibling, 0, 'Sibling');
    });

    // 7c. Hermanos que me tienen en su campo siblings
    people.forEach(person => {
      if (person.id === rootId) return;
      if (visited.has(person.id)) return;

      if ((person.siblings || []).includes(rootId)) {
        addNode(person, 0, 'Sibling');
        return;
      }

      // Verificar si esta persona comparte al menos un padre conmigo
      const sharesParent = person.parents.some(pid => focusPerson.parents.includes(pid));
      if (sharesParent) {
        addNode(person, 0, 'Sibling');
        return;
      }

      // Verificar si alguno de los padres de esta persona me tiene como hijo
      const theirParents = person.parents.map(pid => getPerson(pid)).filter((p): p is Person => !!p);
      const imTheirSibling = theirParents.some(parent => parent.children.includes(rootId));
      if (imTheirSibling) {
        addNode(person, 0, 'Sibling');
      }
    });

    // 7d. Expandir el grupo de hermanos para cualquier nodo gen=0 ya visible.
    // Esto evita que al crear hermanos sin madre/padre aún definidos no aparezcan,
    // especialmente cuando el layout usa una raíz estable distinta al seleccionado.
    const gen0SeedIds = new Set<string>();
    Array.from(nodes.values()).forEach(n => {
      if (n.generation !== 0) return;
      if (n.relationType === 'Focus' || n.relationType === 'Sibling') {
        gen0SeedIds.add(n.id);
      }
    });

    gen0SeedIds.forEach(seedId => {
      const seed = getPerson(seedId);
      if (!seed) return;
      collectSiblingsOf(seed).forEach(sibId => {
        const sibling = getPerson(sibId);
        if (sibling) addNode(sibling, 0, 'Sibling');
      });
    });

    // 8. Parejas de mis hermanos (Cuñados) - Generación 0
    const siblings = Array.from(nodes.values()).filter(n => n.relationType === 'Sibling');
    siblings.forEach(sibling => {
      sibling.partners.forEach(partnerId => {
        const partner = getPerson(partnerId);
        if (partner) addNode(partner, 0, partner.gender === 'Male' ? 'Cuñado' : 'Cuñada');
      });
    });

    // 9. Hijos de mis hermanos (Sobrinos) - Generación 1
    siblings.forEach(sibling => {
      sibling.children.forEach(nephewId => {
        const nephew = getPerson(nephewId);
        if (nephew) addNode(nephew, 1, nephew.gender === 'Male' ? 'Sobrino' : 'Sobrina');
      });
    });

    // 10. Hijos (Generación 1)
    Array.from(visibleChildrenIds).forEach(childId => {
      const child = getPerson(childId);
      if (child) addNode(child, 1, 'Child');
    });

    // 11. Parejas de mis hijos (Yernos/Nueras) - Generación 1
    Array.from(visibleChildrenIds).forEach(childId => {
      const child = getPerson(childId);
      if (child) {
        child.partners.forEach(partnerId => {
          const partner = getPerson(partnerId);
          if (partner) {
            addNode(partner, 1, 'ChildPartner');

            // 11b. Padres de la pareja del hijo (Consuegros) - Generación -1 (o misma que mis padres)
            partner.parents.forEach(parentInLawId => {
              const pil = getPerson(parentInLawId);
              if (pil) {
                addNode(pil, -1, pil.gender === 'Male' ? 'Consuegro' : 'Consuegra');

                // 11c. Abuelos de la pareja del hijo (Bisabuelos de los nietos) - Gen -2
                pil.parents.forEach(gpId => {
                  const gp = getPerson(gpId);
                  if (gp) addNode(gp, -2, 'Ancestor');
                });
              }
            });

            // Inferir el otro progenitor si no está en parents
            partner.parents.forEach(pilId => {
              const pil = getPerson(pilId);
              if (pil) {
                pil.partners.forEach(spouseId => {
                  const spouse = getPerson(spouseId);
                  if (spouse && (pil.children.includes(partnerId) || spouse.children.includes(partnerId))) {
                    addNode(spouse, -1, spouse.gender === 'Male' ? 'Consuegro' : 'Consuegra');

                    // Abuelos desde este lado también
                    spouse.parents.forEach(gpId => {
                      const gp = getPerson(gpId);
                      if (gp) addNode(gp, -2, 'Ancestor');
                    });
                  }
                });
              }
            });
          }
        });
      }
    });

    // 12. Nietos (Generación 2)
    Array.from(visibleChildrenIds).forEach(childId => {
      const child = getPerson(childId);
      if (child) {
        child.children.forEach(gcId => {
          const gc = getPerson(gcId);
          if (gc) addNode(gc, 2, 'Grandchild');
        });
      }
    });

    // 12b. Bisnietos y superiores (Generación 3 en adelante)
    const maxDescDepth = 6; // 3 bisnieto/a, 4 tataranieto/a, 5 tatar x2...
    const descQueue: Array<{ person: Person; depth: number }> = [];
    // arrancar desde nietos (depth=2)
    Array.from(visibleChildrenIds).forEach(childId => {
      const child = getPerson(childId);
      if (!child) return;
      child.children.forEach(gcId => {
        const gc = getPerson(gcId);
        if (gc) descQueue.push({ person: gc, depth: 2 });
      });
    });

    while (descQueue.length > 0) {
      const { person, depth } = descQueue.shift()!;
      const nextDepth = depth + 1;
      if (nextDepth > maxDescDepth) continue;
      person.children.forEach(cid => {
        const c = getPerson(cid);
        if (!c) return;
        addNode(c, nextDepth, `Descendant${nextDepth}`);
        descQueue.push({ person: c, depth: nextDepth });
      });
    }

    // 13. Tíos (Generación -1)
    parents.forEach(parent => {
      parent.parents.forEach(gpId => {
        const gp = getPerson(gpId);
        if (gp) {
          gp.children.forEach(uncleId => {
            if (uncleId !== parent.id) {
              const uncle = getPerson(uncleId);
              if (uncle) addNode(uncle, -1, 'Uncle/Aunt');
            }
          });
        }
      });
    });

    // 13b. Tíos por hermanos del padre/madre (funciona sin abuelos)
    parents.forEach(parent => {
      collectSiblingsOf(parent).forEach(uncleId => {
        const uncle = getPerson(uncleId);
        if (uncle) addNode(uncle, -1, 'Uncle/Aunt');
      });
    });

    // 14. Parejas de tíos - Generación -1
    const uncles = Array.from(nodes.values()).filter(n => n.relationType === 'Uncle/Aunt');
    uncles.forEach(uncle => {
      uncle.partners.forEach(partnerId => {
        const partner = getPerson(partnerId);
        if (partner) addNode(partner, -1, 'UnclePartner');
      });
    });

    // 15. Primos (hijos de tíos) - Generación 0
    // Incluir también hijos de la pareja del tío/tía (para cuando los hijos solo aparecen bajo el cónyuge)
    const allUncleIds = new Set(uncles.map(u => u.id));
    const unclePartners = Array.from(nodes.values()).filter(n => n.relationType === 'UnclePartner');

    // Recopilar todos los hijos de tíos y sus parejas
    const cousinCandidates = new Set<string>();

    [...uncles, ...unclePartners].forEach(uncleOrPartner => {
      (uncleOrPartner.children || []).forEach(cousinId => {
        cousinCandidates.add(cousinId);
      });

      // También añadir hijos de la pareja (por si los hijos solo están en uno de los dos)
      (uncleOrPartner.partners || []).forEach(partnerId => {
        const partner = getPerson(partnerId);
        if (partner) {
          (partner.children || []).forEach(cousinId => {
            cousinCandidates.add(cousinId);
          });
        }
      });
    });

    cousinCandidates.forEach(cousinId => {
      // Evitar añadir al propio foco o a padres del foco como "primo"
      if (cousinId === rootId) return;
      if (focusPerson.parents.includes(cousinId)) return;
      const cousin = getPerson(cousinId);
      if (cousin) addNode(cousin, 0, 'Cousin');
    });

    // 16. Parejas de primos - Generación 0
    const cousins = Array.from(nodes.values()).filter(n => n.relationType === 'Cousin');
    cousins.forEach(cousin => {
      cousin.partners.forEach(partnerId => {
        const partner = getPerson(partnerId);
        if (partner) addNode(partner, 0, 'CousinPartner');
      });
    });

    // 17. Hijos de primos (sobrinos segundos) - Generación 1
    cousins.forEach(cousin => {
      cousin.children.forEach(childId => {
        const child = getPerson(childId);
        if (child) addNode(child, 1, 'CousinChild');
      });
    });

    // Ordenar por generación para el renderizado
    return Array.from(nodes.values()).sort((a, b) => a.generation - b.generation);

  }, [people, focusId, viewRootId, getPerson]);

  return familyTree;
};