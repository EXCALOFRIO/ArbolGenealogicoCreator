import { AutocompleteData } from '../types';

// Cargar archivos CSV
const loadCsv = async (path: string): Promise<string[]> => {
  try {
    const response = await fetch(path);
    const text = await response.text();
    return text.split('\n').map(l => l.trim().toUpperCase()).filter(Boolean);
  } catch (error) {
    console.error(`Error loading ${path}:`, error);
    return [];
  }
};

let cachedData: AutocompleteData | null = null;

export const getAutocompleteData = async (): Promise<AutocompleteData> => {
  if (cachedData) return cachedData;

  const [maleNames, femaleNames, surnames] = await Promise.all([
    loadCsv('/male_names.csv'),
    loadCsv('/female_names.csv'),
    loadCsv('/surnames.csv'),
  ]);

  cachedData = { maleNames, femaleNames, surnames };
  return cachedData;
};

// Función para detectar el género basado en el nombre
export const detectGender = async (name: string): Promise<'Male' | 'Female' | null> => {
  const data = await getAutocompleteData();
  const upperName = name.toUpperCase().trim();
  
  // Buscar coincidencia exacta o que empiece con el nombre
  const isMale = data.maleNames.some(n => n === upperName || n.startsWith(upperName + ' '));
  const isFemale = data.femaleNames.some(n => n === upperName || n.startsWith(upperName + ' '));
  
  if (isMale && !isFemale) return 'Male';
  if (isFemale && !isMale) return 'Female';
  
  // Si está en ambas listas o ninguna, devolver null
  return null;
};

// Obtener sugerencias de nombres filtradas
export const getNameSuggestions = async (query: string, gender?: 'Male' | 'Female'): Promise<string[]> => {
  const data = await getAutocompleteData();
  const upperQuery = query.toUpperCase();
  
  let names: string[];
  if (gender === 'Male') {
    names = data.maleNames;
  } else if (gender === 'Female') {
    names = data.femaleNames;
  } else {
    names = [...data.maleNames, ...data.femaleNames];
  }
  
  return names.filter(n => n.startsWith(upperQuery)).slice(0, 8);
};