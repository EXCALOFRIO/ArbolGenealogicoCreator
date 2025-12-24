import React, { useState, useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
  label: string;
  multiWord?: boolean;
  dataTutorial?: string;
}

export const AutocompleteInput: React.FC<Props> = ({ value, onChange, suggestions, placeholder, label, multiWord, dataTutorial }) => {
  const [filtered, setFiltered] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getQueryParts = (rawUpper: string) => {
    if (!multiWord) return { prefix: '', token: rawUpper };

    const hasTrailingSpace = /\s$/.test(rawUpper);
    const trimmedEnd = rawUpper.replace(/\s+$/g, '');
    if (!trimmedEnd) {
      return { prefix: '', token: '' };
    }
    const parts = trimmedEnd.split(/\s+/g);
    const token = hasTrailingSpace ? '' : (parts.pop() || '');
    const prefix = parts.length > 0 ? (parts.join(' ') + ' ') : '';
    return { prefix, token };
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const val = raw.toUpperCase();
    onChange(val);

    const { token } = getQueryParts(val);
    if (token.length > 0) {
      const matches = suggestions
        .filter(s => s.toLowerCase().startsWith(token.toLowerCase()))
        .slice(0, 5);
      setFiltered(matches);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const selectSuggestion = (val: string) => {
    const suggestion = val.toUpperCase();

    if (!multiWord) {
      onChange(suggestion);
      setIsOpen(false);
      return;
    }

    const current = value.toUpperCase();
    const { prefix } = getQueryParts(current);
    onChange((prefix + suggestion).trimEnd());
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5 relative" ref={wrapperRef} data-tutorial={dataTutorial}>
      <label className="text-[11px] text-slate-400 font-medium">{label}</label>
      <input
        type="text"
        className={`
          bg-slate-800/50 border rounded-xl px-4 py-3 text-white text-sm
          focus:outline-none transition-all duration-200
          placeholder-slate-500
          ${isFocused 
            ? 'border-cyan-500/50 ring-2 ring-cyan-500/20' 
            : 'border-slate-700 hover:border-slate-600'}
        `}
        value={value}
        onChange={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
      />
      {isOpen && filtered.length > 0 && (
        <ul className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl mt-1 z-50 max-h-40 overflow-y-auto shadow-xl overflow-hidden">
          {filtered.map((suggestion, idx) => (
            <li 
              key={idx}
              className="px-4 py-2.5 hover:bg-slate-700 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors border-b border-slate-700/50 last:border-0"
              onClick={() => selectSuggestion(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};