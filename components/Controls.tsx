import React, { useState, useEffect, useRef } from 'react';
import { useFamilyStore } from '../store/familyStore';
import { AutocompleteInput } from './AutocompleteInput';
import { getAutocompleteData, detectGender } from '../services/namesService';
import { Person, Gender } from '../types';
import { searchSemantically, SemanticSearchResult } from '../services/searchService';

export const Controls: React.FC = () => {
  const { people, focusId, getPerson, setFocusId, viewMode, setViewMode, isModalOpen, modalContext, closeAddModal, addRelative, linkSiblings, editingPerson, updatePerson } = useFamilyStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newSurnames, setNewSurnames] = useState('');
  const [newGender, setNewGender] = useState<Gender>('Male');
  const [newPhoto, setNewPhoto] = useState<string>('');
  const [genderAutoDetected, setGenderAutoDetected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data for autocomplete
  const [nameOptions, setNameOptions] = useState<string[]>([]);
  const [surnameOptions, setSurnameOptions] = useState<string[]>([]);


  useEffect(() => {
    getAutocompleteData().then(data => {
      setNameOptions([...data.maleNames, ...data.femaleNames]);
      setSurnameOptions(data.surnames);
    });
  }, []);

  // Cargar datos cuando se está editando
  useEffect(() => {
    if (editingPerson) {
      setNewName(editingPerson.name);
      setNewSurnames(editingPerson.surnames);
      setNewGender(editingPerson.gender);
      setNewPhoto(editingPerson.photo || '');
    }
  }, [editingPerson]);

  // Autodetectar género cuando cambia el nombre
  useEffect(() => {
    const detectAndSetGender = async () => {
      const trimmed = newName.trim();
      if (trimmed.length < 2) {
        setGenderAutoDetected(false);
        return;
      }

      const detected = await detectGender(trimmed);
      if (detected) {
        setNewGender(detected);
        setGenderAutoDetected(true);
      } else {
        // Si no hay detección por listas (male/female), no forzamos un cambio
        setGenderAutoDetected(false);
      }
    };
    detectAndSetGender();
  }, [newName]);

  // Autocompletar apellidos por defecto según el contexto (solo al abrir modal y si está vacío)
  useEffect(() => {
    if (!isModalOpen) return;
    if (editingPerson) return;
    if (newSurnames.trim().length > 0) return;

    const focusPerson = getPerson(focusId);
    if (!focusPerson) return;

    // Utilidades para apellidos
    const getSurnamesParts = (s: string) => (s || '').trim().split(/\s+/g).filter(Boolean);
    const firstSurname = (s: string) => getSurnamesParts(s)[0] || '';
    const up = (s: string) => s.toUpperCase();

    if (modalContext === 'Sibling') {
      if (focusPerson.surnames) setNewSurnames(up(focusPerson.surnames));
      return;
    }

    // LÓGICA PARA PADRE/MADRE - Inferir apellidos del hijo
    if (modalContext === 'Parent') {
      const childSurnames = getSurnamesParts(focusPerson.surnames);

      // El hijo ya tiene padre o madre?
      const existingParents = focusPerson.parents.map(pid => getPerson(pid)).filter((p): p is Person => !!p);
      const hasFather = existingParents.some(p => p.gender === 'Male');
      const hasMother = existingParents.some(p => p.gender === 'Female');

      // En España: hijo tiene [Apellido1_padre] [Apellido1_madre] [Apellido2_padre?] [Apellido2_madre?]
      // Si el hijo tiene 2 apellidos: "García López"
      //   - Padre: "García ?" (primer apellido del hijo)
      //   - Madre: "López ?" (segundo apellido del hijo)
      // Si el hijo tiene 4 apellidos: "García López Pérez Martín"
      //   - Padre: "García Pérez" (posiciones 0 y 2)
      //   - Madre: "López Martín" (posiciones 1 y 3)

      if (childSurnames.length >= 2) {
        // Determinar si estamos añadiendo padre o madre basado en si ya existe uno
        let inferredSurnames = '';

        if (!hasFather && !hasMother) {
          // No hay ningún padre todavía - asumimos que será padre (primer apellido)
          // Posiciones pares para el padre: 0, 2, 4...
          const fatherSurnames = childSurnames.filter((_, i) => i % 2 === 0);
          inferredSurnames = fatherSurnames.join(' ');
        } else if (hasFather && !hasMother) {
          // Ya hay padre, este será madre (segundo apellido)
          // Posiciones impares para la madre: 1, 3, 5...
          const motherSurnames = childSurnames.filter((_, i) => i % 2 === 1);
          inferredSurnames = motherSurnames.join(' ');
        } else if (!hasFather && hasMother) {
          // Ya hay madre, este será padre
          const fatherSurnames = childSurnames.filter((_, i) => i % 2 === 0);
          inferredSurnames = fatherSurnames.join(' ');
        }

        if (inferredSurnames) {
          setNewSurnames(up(inferredSurnames));
        }
      } else if (childSurnames.length === 1) {
        // Solo un apellido - usarlo como base
        setNewSurnames(up(childSurnames[0]));
      }
      return;
    }

    if (modalContext === 'Child') {
      const partnerId = focusPerson.partners?.[0];
      const partner = partnerId ? getPerson(partnerId) : undefined;

      if (!partner) {
        // Solo un progenitor conocido
        const s1 = firstSurname(focusPerson.surnames);
        if (s1) setNewSurnames(up(s1));
        return;
      }

      // Padre primero, madre segundo (si se puede inferir por género)
      const a = focusPerson;
      const b = partner;
      const father = a.gender === 'Male' ? a : (b.gender === 'Male' ? b : a);
      const mother = a.gender === 'Female' ? a : (b.gender === 'Female' ? b : b);
      const sFather = firstSurname(father.surnames);
      const sMother = firstSurname(mother.surnames);

      const combined = [sFather, sMother].filter(Boolean).join(' ');
      if (combined) setNewSurnames(up(combined));
    }
  }, [isModalOpen, modalContext, editingPerson, focusId, getPerson, newSurnames]);

  // NUEVO: Actualizar apellidos cuando cambia el género detectado en contexto de Parent
  // Si el nombre es femenino, usa los apellidos de la madre (posiciones impares)
  // Si el nombre es masculino, usa los apellidos del padre (posiciones pares)
  useEffect(() => {
    if (!isModalOpen || modalContext !== 'Parent' || editingPerson) return;
    if (!genderAutoDetected) return; // Solo si el género fue detectado automáticamente

    const focusPerson = getPerson(focusId);
    if (!focusPerson) return;

    const getSurnamesParts = (s: string) => (s || '').trim().split(/\s+/g).filter(Boolean);
    const up = (s: string) => s.toUpperCase();
    const childSurnames = getSurnamesParts(focusPerson.surnames);

    if (childSurnames.length < 2) return;

    // Verificar si ya hay padres existentes
    const existingParents = focusPerson.parents.map(pid => getPerson(pid)).filter((p): p is Person => !!p);
    const hasFather = existingParents.some(p => p.gender === 'Male');
    const hasMother = existingParents.some(p => p.gender === 'Female');

    // Solo ajustar si no hay ningún padre todavía (estamos añadiendo el primero)
    if (hasFather || hasMother) return;

    let inferredSurnames = '';
    if (newGender === 'Female') {
      // Si es nombre femenino → usar apellidos de madre (posiciones impares: 1, 3)
      const motherSurnames = childSurnames.filter((_, i) => i % 2 === 1);
      inferredSurnames = motherSurnames.join(' ');
    } else if (newGender === 'Male') {
      // Si es nombre masculino → usar apellidos de padre (posiciones pares: 0, 2)
      const fatherSurnames = childSurnames.filter((_, i) => i % 2 === 0);
      inferredSurnames = fatherSurnames.join(' ');
    }

    if (inferredSurnames) {
      setNewSurnames(up(inferredSurnames));
    }
  }, [isModalOpen, modalContext, editingPerson, focusId, getPerson, newGender, genderAutoDetected]);

  const semanticResults = searchTerm.includes(' DE ') ? searchSemantically(searchTerm, people) : [];

  const searchResults: (Person | SemanticSearchResult)[] = searchTerm.length >= 1
    ? (semanticResults.length > 0
      ? semanticResults
      : people.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.surnames.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    : [];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = () => {
    if (editingPerson) {
      // Actualizar persona existente
      updatePerson({
        ...editingPerson,
        name: newName.toUpperCase(),
        surnames: newSurnames.toUpperCase(),
        gender: newGender,
        photo: newPhoto || undefined,
      });
    } else {
      // Caso especial: si estamos añadiendo HERMANO/A y esa persona ya existe en el árbol,
      // enlazarla para que no quede “suelta” (aunque no haya padres).
      if (modalContext === 'Sibling') {
        const targetName = newName.toUpperCase().trim();
        const targetSurnames = newSurnames.toUpperCase().trim();
        const hasSomeInput = targetName.length >= 2;
        if (hasSomeInput) {
          const candidates = people
            .filter(p => p.id !== focusId)
            .filter(p => p.name.toUpperCase().trim() === targetName)
            .filter(p => {
              // Si el usuario indicó apellidos, exigir match exacto; si no, permitir match solo por nombre.
              if (targetSurnames.length > 0) return (p.surnames || '').toUpperCase().trim() === targetSurnames;
              return true;
            });

          if (candidates.length > 0) {
            // Preferir el más “suelto” (menos relaciones) para evitar unir con alguien ya conectado a otra rama.
            const score = (p: Person) => (p.parents?.length || 0) + (p.partners?.length || 0) + (p.children?.length || 0) + (p.siblings?.length || 0);
            const best = [...candidates].sort((a, b) => score(a) - score(b))[0];

            linkSiblings(focusId, best.id);
            setFocusId(best.id);
            handleClose();
            return;
          }
        }
      }

      // Crear nueva persona
      const id = 'P' + Date.now();
      const person: Person = {
        id,
        name: newName.toUpperCase(),
        surnames: newSurnames.toUpperCase(),
        gender: newGender,
        photo: newPhoto || undefined,
        partners: [],
        parents: [],
        children: [],
        siblings: []
      };

      if (modalContext === 'None') {
        useFamilyStore.getState().addPerson(person);
      } else {
        addRelative(person, modalContext);
      }

      setFocusId(id);
    }
    handleClose();
  };

  const handleClose = () => {
    closeAddModal();
    setNewName('');
    setNewSurnames('');
    setNewPhoto('');
    setGenderAutoDetected(false);
  };

  // Traducción del contexto
  const getContextLabel = () => {
    if (editingPerson) return 'EDITANDO';
    return {
      'Parent': 'PADRE/MADRE',
      'Child': 'HIJO/A',
      'Sibling': 'HERMANO/A',
      'Partner': 'PAREJA',
      'None': 'PERSONA'
    }[modalContext];
  };

  return (
    <>
      {/* Top Bar: Search */}
      {people.length > 0 && (
        <div className="fixed top-0 left-0 right-0 p-2 sm:p-4 z-50 flex justify-center pointer-events-none">
          <div className="relative pointer-events-auto w-full max-w-xs sm:max-w-md">
            <div
              style={{
                background: 'var(--card-bg)',
                borderColor: isSearchFocused ? 'var(--accent-highlight)' : 'var(--card-border)'
              }}
              className={`
          flex items-center 
          backdrop-blur-xl rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 border
          shadow-lg
          transition-all duration-300 ease-out
          ${isSearchFocused ? 'ring-2' : 'hover:opacity-95'}
        `}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                style={{ color: isSearchFocused ? 'var(--accent-highlight)' : 'var(--app-text-subtle)' }}
                className="w-4 h-4 mr-2 sm:mr-3 flex-shrink-0 transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar en el linaje..."
                style={{ color: 'var(--app-text)' }}
                className="bg-transparent w-full focus:outline-none text-sm placeholder-opacity-60"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value.toUpperCase())}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              />

              <button
                type="button"
                title={viewMode === 'tree' ? 'Cambiar a vista lista' : 'Cambiar a vista mapa'}
                onClick={() => setViewMode(viewMode === 'tree' ? 'list' : 'tree')}
                style={{ color: 'var(--app-text-subtle)' }}
                className="ml-2 p-1.5 rounded-lg hover:opacity-70 transition-colors"
              >
                {viewMode === 'tree' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M10 14h10M10 18h10M4 14h4v4H4v-4z" />
                  </svg>
                )}
              </button>

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ color: 'var(--app-text-subtle)' }}
                  className="hover:opacity-70 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div
                style={{
                  background: 'var(--menu-bg)',
                  borderColor: 'var(--menu-border)'
                }}
                className="absolute top-full mt-2 w-full backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border max-h-64 overflow-y-auto"
              >
                {searchResults.map(result => {
                  const p = 'person' in result ? result.person : result;
                  const desc = 'relationDescription' in result ? result.relationDescription : null;

                  return (
                    <div
                      key={p.id}
                      style={{ borderColor: 'var(--card-border)' }}
                      className="px-4 py-3 cursor-pointer border-b last:border-0 flex justify-between items-center group transition-all hover:opacity-80"
                      onClick={() => { setFocusId(p.id); setSearchTerm(''); }}
                    >
                      <div className="flex items-center gap-3">
                        {p.photo ? (
                          <img src={p.photo} className="w-8 h-8 rounded-full object-cover" alt="" />
                        ) : (
                          <div style={{ background: 'var(--gradient-secondary-accent)' }} className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <div style={{ color: 'var(--app-text)' }} className="font-semibold text-sm transition-colors">{p.name}</div>
                            {desc && (
                              <span style={{ background: 'var(--secondary-500)', color: 'white' }} className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase">
                                {desc}
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--app-text-muted)' }} className="text-[10px]">{p.surnames}</div>
                        </div>
                      </div>
                      <svg style={{ color: 'var(--app-text-subtle)' }} className="w-4 h-4 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creation/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center pointer-events-auto z-[100] p-4">
          <div
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--card-border)'
            }}
            className="p-6 sm:p-10 rounded-[32px] w-full max-w-md sm:max-w-xl shadow-2xl border relative overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div style={{ background: 'var(--gradient-secondary-accent)' }} className="absolute top-0 left-0 w-full h-1" />

            <h2 style={{ color: 'var(--app-text)' }} className="text-2xl sm:text-3xl font-black mb-2 tracking-tighter">
              {editingPerson ? 'Editar Persona' : 'Vincular Persona'}
            </h2>
            <p
              style={{
                color: 'var(--secondary-950)',
                background: 'var(--secondary-500)'
              }}
              className="text-xs sm:text-sm font-black mb-6 sm:mb-8 inline-block px-4 sm:px-6 py-2 rounded-full shadow-md uppercase tracking-wider"
            >
              {getContextLabel()}
            </p>

            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-2 sm:gap-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'var(--background-100)',
                    borderColor: 'var(--card-border)'
                  }}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-dashed cursor-pointer flex items-center justify-center overflow-hidden transition-all group hover:opacity-80 mb-4"
                >
                  {newPhoto ? (
                    <img src={newPhoto} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div style={{ color: 'var(--app-text-subtle)' }} className="flex flex-col items-center transition-colors">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs sm:text-sm font-bold mt-2">Añadir Foto</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                {newPhoto && (
                  <button
                    onClick={() => setNewPhoto('')}
                    className="text-[10px] text-red-500 hover:text-red-400"
                  >
                    Quitar foto
                  </button>
                )}
              </div>

              <AutocompleteInput
                label="Nombre"
                value={newName}
                onChange={setNewName}
                suggestions={nameOptions}
                placeholder="Ej. Alejandro"
              />
              <AutocompleteInput
                label="Apellidos"
                value={newSurnames}
                onChange={setNewSurnames}
                suggestions={surnameOptions}
                placeholder="Ej. Ramírez"
                multiWord
              />

              <div className="flex gap-3 sm:gap-4 mt-4 sm:mt-6">
                <button
                  onClick={handleCreate}
                  disabled={!newName || !newSurnames}
                  style={{ background: 'var(--secondary-500)' }}
                  className="flex-[1.5] text-white py-4 sm:py-5 rounded-2xl shadow-xl font-black text-lg sm:text-xl disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed transition-all transform active:scale-[0.98] hover:brightness-110"
                >
                  {editingPerson ? 'Guardar' : 'Confirmar'}
                </button>
                <button
                  onClick={handleClose}
                  style={{
                    background: 'var(--button-secondary-bg)',
                    borderColor: 'var(--button-secondary-border)',
                    color: 'var(--button-secondary-text)'
                  }}
                  className="flex-1 px-6 sm:px-8 py-4 sm:py-5 rounded-2xl font-bold text-base sm:text-xl transition-colors border hover:opacity-90 active:scale-[0.98]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};