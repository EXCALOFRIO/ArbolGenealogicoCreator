export const getGroupColor = (surnames: string): { bg: string, text: string, border: string } => {
  const firstSurname = surnames.split(' ')[0].toUpperCase();

  // Colores definidos para familias específicas (Ramirez, Larena, etc.)
  if (firstSurname === 'RAMIREZ') return { bg: 'bg-emerald-400', text: 'text-emerald-950', border: 'border-emerald-400' };
  if (firstSurname === 'LARENA') return { bg: 'bg-yellow-400', text: 'text-yellow-950', border: 'border-yellow-400' };
  if (firstSurname === 'COQUE') return { bg: 'bg-purple-400', text: 'text-purple-950', border: 'border-purple-400' };
  if (firstSurname === 'JIMENEZ') return { bg: 'bg-cyan-400', text: 'text-cyan-950', border: 'border-cyan-400' };

  // Fallback dinámico para otros apellidos
  const variants = [
    { bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-500' },
    { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-500' },
    { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-500' },
    { bg: 'bg-indigo-500', text: 'text-white', border: 'border-indigo-500' },
    { bg: 'bg-lime-500', text: 'text-lime-950', border: 'border-lime-500' },
  ];
  
  const sum = firstSurname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return variants[sum % variants.length];
};