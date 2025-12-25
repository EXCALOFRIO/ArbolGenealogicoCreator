import React, { useState, useEffect, useRef } from 'react';
import { useFamilyStore } from '../store/familyStore';
import { AutocompleteInput } from './AutocompleteInput';
import { getAutocompleteData, detectGender } from '../services/namesService';
import { Person, Gender } from '../types';
import { useTutorial } from '../hooks/useTutorial';

export const Controls: React.FC = () => {
  const { people, focusId, getPerson, setFocusId, viewMode, setViewMode, isModalOpen, modalContext, closeAddModal, addRelative, linkSiblings, editingPerson, updatePerson } = useFamilyStore();
  const { isActive: tutorialActive, currentStep, goToStep } = useTutorial();
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
  
  // Tutorial auto-advance when typing - funciona para crear persona Y para añadir padre/madre
  useEffect(() => {
    if (!tutorialActive) return;
    
    // Para el primer paso (crearse a sí mismo)
    if (currentStep === 'create-self' && newName.trim().length >= 2) {
      goToStep('enter-surname');
    } 
    else if (currentStep === 'enter-surname' && newSurnames.trim().length >= 3) {
      goToStep('confirm-person');
    }
    // Para añadir padre - reutilizar los subpasos
    else if (currentStep === 'add-father' && isModalOpen && modalContext === 'Parent') {
      // Si ya tiene apellidos autocompletados, ir directo a confirmar
      if (newSurnames.trim().length >= 3 && newName.trim().length >= 2) {
        goToStep('confirm-person');
      } else if (newName.trim().length >= 2 && newSurnames.trim().length < 3) {
        goToStep('enter-surname');
      }
    }
    // Para añadir madre - reutilizar los subpasos
    else if (currentStep === 'add-mother' && isModalOpen && modalContext === 'Parent') {
      if (newSurnames.trim().length >= 3 && newName.trim().length >= 2) {
        goToStep('confirm-person');
      } else if (newName.trim().length >= 2 && newSurnames.trim().length < 3) {
        goToStep('enter-surname');
      }
    }
  }, [tutorialActive, currentStep, newName, newSurnames, goToStep, isModalOpen, modalContext]);

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

  const searchResults = searchTerm.length > 1 
    ? people.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.surnames.toLowerCase().includes(searchTerm.toLowerCase())
      )
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
        <div className={`
          flex items-center bg-slate-900/90 backdrop-blur-xl rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 
          transition-all duration-300 ease-out
          ${isSearchFocused 
            ? 'ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/10 border-cyan-500/50' 
            : 'border border-slate-700/50 hover:border-slate-600/50'}
        `}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" 
              className={`w-4 h-4 mr-2 sm:mr-3 flex-shrink-0 transition-colors ${isSearchFocused ? 'text-cyan-400' : 'text-slate-500'}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input 
              type="text" 
              placeholder="Buscar en el linaje..." 
              className="bg-transparent text-white w-full focus:outline-none text-sm placeholder-slate-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value.toUpperCase())}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />

            <button
              type="button"
              title={viewMode === 'tree' ? 'Cambiar a vista lista' : 'Cambiar a vista mapa'}
              onClick={() => setViewMode(viewMode === 'tree' ? 'list' : 'tree')}
              className="ml-2 text-slate-500 hover:text-white transition-colors"
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
                className="text-slate-500 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
        </div>
        
        {searchResults.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50 max-h-64 overflow-y-auto">
            {searchResults.map(p => (
              <div 
                key={p.id} 
                className="px-4 py-3 hover:bg-slate-800/80 cursor-pointer border-b border-slate-800/50 last:border-0 flex justify-between items-center group transition-all"
                onClick={() => { setFocusId(p.id); setSearchTerm(''); }}
              >
                <div className="flex items-center gap-3">
                  {p.photo ? (
                    <img src={p.photo} className="w-8 h-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {p.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-white text-sm group-hover:text-cyan-400 transition-colors">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.surnames}</div>
                  </div>
                </div>
                <svg className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    )}

    {/* Creation/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-auto z-[100] p-4">
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl w-full max-w-sm sm:max-w-md shadow-2xl border border-slate-700/50 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500" />

            <h2 className="text-base sm:text-lg font-bold mb-1 text-white">
              {editingPerson ? 'Editar Persona' : 'Vincular Persona'}
            </h2>
            <p className="text-[10px] sm:text-[11px] text-cyan-400 font-medium mb-4 sm:mb-5 bg-cyan-950/40 inline-block px-2 sm:px-3 py-1 rounded-full">
                {getContextLabel()}
            </p>
            
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-2 sm:gap-3">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-700/50 border-2 border-dashed border-slate-600 hover:border-cyan-500/50 cursor-pointer flex items-center justify-center overflow-hidden transition-all group"
                >
                  {newPhoto ? (
                    <img src={newPhoto} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-500 group-hover:text-cyan-400 transition-colors">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[8px] sm:text-[9px] mt-1">Foto</span>
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
                    className="text-[10px] text-red-400 hover:text-red-300"
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
                dataTutorial="nombre"
              />
              <AutocompleteInput 
                label="Apellidos" 
                value={newSurnames} 
                onChange={setNewSurnames} 
                suggestions={surnameOptions} 
                placeholder="Ej. Ramírez"
                multiWord
                dataTutorial="apellidos"
              />

              <div className="flex gap-2 sm:gap-3 mt-2 sm:mt-3">
                <button 
                  onClick={handleCreate}
                  disabled={!newName || !newSurnames}
                  data-tutorial="confirmar"
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white py-2.5 sm:py-3 rounded-xl shadow-lg font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                >
                  {editingPerson ? 'Guardar' : 'Confirmar'}
                </button>
                <button 
                  onClick={handleClose}
                  className="px-4 sm:px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 sm:py-3 rounded-xl font-medium text-sm transition-colors border border-slate-700"
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