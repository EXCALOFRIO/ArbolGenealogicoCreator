import React, { useMemo, useState } from 'react';
import { useFamilyLogic } from '../hooks/useFamilyLogic';
import { useFamilyStore } from '../store/familyStore';
import { RenderNode } from '../types';

type ExpandKey = 'parents' | 'partners' | 'children';

const roleLabel = (role: string) => {
  if (!role) return '';
  const map: Record<string, string> = {
    Focus: 'YO',
    Parent: 'PADRE/MADRE',
    Partner: 'PAREJA',
    Child: 'HIJO/A',
    Sibling: 'HERMANO/A',
    Grandparent: 'ABUELO/A',
    'Uncle/Aunt': 'TÍO/TÍA',
    Cousin: 'PRIMO/A',
  };
  return map[role] || role.toUpperCase();
};

const roleBadgeClass = (role: string) => {
  // Usando CSS variables del tema
  if (role === 'Focus') return 'focus-badge';
  if (role === 'Parent' || role === 'Grandparent' || role.startsWith('Ancestor')) return 'parent-badge';
  if (role === 'Partner' || role === 'ChildPartner') return 'partner-badge';
  if (role === 'Child' || role.startsWith('Descendant')) return 'child-badge';
  if (role === 'Sibling' || role === 'PartnerSibling') return 'sibling-badge';
  return 'default-badge';
};

const smallLabel = (text: string) => (
  <span style={{ color: 'var(--app-text-muted)' }} className="text-[10px] sm:text-[11px] uppercase tracking-wide">{text}</span>
);

export const FamilyListView: React.FC = () => {
  const familyTree = useFamilyLogic();
  const { getPerson, focusId, setFocusId } = useFamilyStore();
  const [expanded, setExpanded] = useState<Record<string, Partial<Record<ExpandKey, boolean>>>>({});

  const byGeneration = useMemo(() => {
    const groups = new Map<number, RenderNode[]>();
    familyTree.forEach((n) => {
      const list = groups.get(n.generation) || [];
      list.push(n);
      groups.set(n.generation, list);
    });

    // Ordenar cada generación por tipo y nombre para que sea legible
    groups.forEach((list, gen) => {
      list.sort((a, b) => {
        const ra = (a.relationType || '').toString();
        const rb = (b.relationType || '').toString();
        if (ra !== rb) return ra.localeCompare(rb);
        const na = `${a.surnames || ''} ${a.name || ''}`.trim();
        const nb = `${b.surnames || ''} ${b.name || ''}`.trim();
        return na.localeCompare(nb);
      });
      groups.set(gen, list);
    });

    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [familyTree]);

  const genLabel = (gen: number) => {
    if (gen === 0) return 'Generación 0';
    if (gen > 0) return `Generación +${gen}`;
    return `Generación ${gen}`;
  };

  const toggleExpanded = (personId: string, key: ExpandKey) => {
    setExpanded((prev) => ({
      ...prev,
      [personId]: {
        ...(prev[personId] || {}),
        [key]: !(prev[personId]?.[key] || false),
      },
    }));
  };

  const renderChips = (ownerId: string, key: ExpandKey, ids: string[], emptyLabel = '—') => {
    const clean = (ids || []).filter(Boolean);
    if (clean.length === 0) return <span style={{ color: 'var(--app-text-subtle)' }}>{emptyLabel}</span>;

    const isExpanded = !!expanded[ownerId]?.[key];
    const limit = 3;
    const visible = isExpanded ? clean : clean.slice(0, limit);
    const hiddenCount = clean.length - visible.length;

    return (
      <div className="flex flex-wrap gap-1.5">
        {visible.map((id) => {
          const p = getPerson(id);
          const label = p ? `${p.name} ${p.surnames}`.trim() : id;
          return (
            <button
              key={id}
              type="button"
              onClick={(e) => { e.stopPropagation(); setFocusId(id); }}
              style={{
                background: id === focusId ? 'var(--background-200)' : 'var(--background-100)',
                borderColor: id === focusId ? 'var(--accent-highlight)' : 'var(--card-border)',
                color: 'var(--app-text)'
              }}
              className="px-2 py-1 rounded-full border text-[10px] sm:text-[11px] transition-colors hover:opacity-80"
              title={label}
            >
              {label}
            </button>
          );
        })}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleExpanded(ownerId, key); }}
            style={{
              background: 'var(--background-100)',
              borderColor: 'var(--card-border)',
              color: 'var(--app-text-muted)'
            }}
            className="px-2 py-1 rounded-full border text-[10px] sm:text-[11px] hover:opacity-80 transition-colors"
          >
            +{hiddenCount} más
          </button>
        )}

        {isExpanded && clean.length > limit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleExpanded(ownerId, key); }}
            style={{
              background: 'var(--background-100)',
              borderColor: 'var(--card-border)',
              color: 'var(--app-text-muted)'
            }}
            className="px-2 py-1 rounded-full border text-[10px] sm:text-[11px] hover:opacity-80 transition-colors"
          >
            Ver menos
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-auto">
      <div className="absolute inset-0 overflow-y-auto pt-20 pb-28 px-3 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <div 
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--card-border)'
            }}
            className="backdrop-blur-xl border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
          >
            <div style={{ borderColor: 'var(--card-border)' }} className="px-4 sm:px-6 py-3 sm:py-4 border-b">
              <div style={{ color: 'var(--app-text)' }} className="text-sm sm:text-base font-bold">Vista Lista</div>
              <div style={{ color: 'var(--app-text-muted)' }} className="text-[11px] sm:text-xs">Personas agrupadas por generación (lo que está en la vista actual).</div>
            </div>

            {byGeneration.length === 0 ? (
              <div style={{ color: 'var(--app-text-muted)' }} className="px-4 sm:px-6 py-6 text-sm">No hay datos para mostrar.</div>
            ) : (
              <div style={{ borderColor: 'var(--card-border)' }} className="divide-y">
                {byGeneration.map(([gen, items]) => (
                  <div key={gen} className="px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div style={{ color: 'var(--secondary-600)' }} className="text-xs sm:text-sm font-semibold">{genLabel(gen)}</div>
                      <div style={{ color: 'var(--app-text-muted)' }} className="text-[10px] sm:text-[11px]">{items.length} persona(s)</div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-[980px] w-full text-left">
                        <thead>
                          <tr style={{ color: 'var(--app-text-muted)' }} className="text-[10px] sm:text-[11px]">
                            <th className="py-2 pr-4 font-medium">PERSONA</th>
                            <th className="py-2 pr-4 font-medium">ROL</th>
                            <th className="py-2 pr-4 font-medium">PADRES</th>
                            <th className="py-2 pr-4 font-medium">PAREJA(S)</th>
                            <th className="py-2 pr-0 font-medium">HIJOS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((node) => {
                            const person = getPerson(node.id);
                            const fullName = `${node.name} ${node.surnames}`.trim();
                            const isSelected = node.id === focusId;
                            const role = node.relationType || '';

                            return (
                              <tr
                                key={node.id}
                                style={{ 
                                  borderColor: 'var(--card-border)',
                                  background: isSelected ? 'var(--background-100)' : 'transparent'
                                }}
                                className="border-t cursor-pointer transition-colors hover:opacity-80"
                                onClick={() => setFocusId(node.id)}
                              >
                                <td className="py-3 pr-4">
                                  <div className="flex items-center gap-3">
                                    {person?.photo ? (
                                      <img
                                        src={person.photo}
                                        style={{ borderColor: 'var(--card-border)' }}
                                        className="w-8 h-8 rounded-full object-cover border"
                                        alt=""
                                      />
                                    ) : (
                                      <div 
                                        style={{ 
                                          background: 'var(--gradient-secondary-accent)',
                                          borderColor: 'var(--card-border)'
                                        }} 
                                        className="w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-bold text-white"
                                      >
                                        {(node.name || '??').substring(0, 2).toUpperCase()}
                                      </div>
                                    )}

                                    <div className="min-w-0">
                                      <div style={{ color: 'var(--app-text)' }} className="font-semibold text-[12px] sm:text-sm truncate">{fullName || node.id}</div>
                                      <div style={{ color: 'var(--app-text-muted)' }} className="text-[10px] sm:text-[11px] truncate">{node.gender === 'Female' ? 'MUJER' : 'HOMBRE'}</div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 pr-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[10px] sm:text-[11px] font-semibold ${roleBadgeClass(role)}`}>
                                    {roleLabel(role)}
                                  </span>
                                </td>

                                <td className="py-3 pr-4 align-top">
                                  {renderChips(node.id, 'parents', node.parents || [])}
                                </td>

                                <td className="py-3 pr-4 align-top">
                                  {renderChips(node.id, 'partners', node.partners || [])}
                                </td>

                                <td className="py-3 pr-0 align-top">
                                  {renderChips(node.id, 'children', node.children || [])}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Vista compacta tipo tarjetas en móvil */}
                    <div className="sm:hidden mt-4 grid grid-cols-1 gap-3">
                      {items.map((node) => {
                        const person = getPerson(node.id);
                        const fullName = `${node.name} ${node.surnames}`.trim();
                        const role = node.relationType || '';
                        const isSelected = node.id === focusId;
                        return (
                          <button
                            key={`${node.id}-card`}
                            type="button"
                            onClick={() => setFocusId(node.id)}
                            style={{
                              background: isSelected ? 'var(--background-100)' : 'var(--card-bg)',
                              borderColor: isSelected ? 'var(--accent-highlight)' : 'var(--card-border)'
                            }}
                            className="text-left p-4 rounded-2xl border transition-colors hover:opacity-90"
                          >
                            <div className="flex items-center gap-3">
                              {person?.photo ? (
                                <img src={person.photo} style={{ borderColor: 'var(--card-border)' }} className="w-10 h-10 rounded-full object-cover border" alt="" />
                              ) : (
                                <div 
                                  style={{ 
                                    background: 'var(--gradient-secondary-accent)',
                                    borderColor: 'var(--card-border)'
                                  }} 
                                  className="w-10 h-10 rounded-full border flex items-center justify-center text-[11px] font-bold text-white"
                                >
                                  {(node.name || '??').substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div style={{ color: 'var(--app-text)' }} className="font-semibold truncate">{fullName || node.id}</div>
                                <div className="mt-1">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[10px] font-semibold ${roleBadgeClass(role)}`}>
                                    {roleLabel(role)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 space-y-2">
                              <div>
                                {smallLabel('Padres')}
                                <div className="mt-1">{renderChips(node.id, 'parents', node.parents || [])}</div>
                              </div>
                              <div>
                                {smallLabel('Pareja(s)')}
                                <div className="mt-1">{renderChips(node.id, 'partners', node.partners || [])}</div>
                              </div>
                              <div>
                                {smallLabel('Hijos')}
                                <div className="mt-1">{renderChips(node.id, 'children', node.children || [])}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
