import React, { useState, useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
  label: string;
  multiWord?: boolean;
}

export const AutocompleteInput: React.FC<Props> = ({ value, onChange, suggestions, placeholder, label, multiWord }) => {
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
    <div className="flex flex-col gap-2 relative" ref={wrapperRef}>
      <label style={{ color: 'var(--app-text)' }} className="text-xs sm:text-sm font-black opacity-90 uppercase tracking-widest">{label}</label>
      <input
        type="text"
        style={{
          background: 'var(--input-bg)',
          borderColor: isFocused ? 'var(--accent-highlight)' : 'var(--input-border)',
          color: 'var(--app-text)'
        }}
        className={`
          border rounded-2xl px-5 py-4 
          text-base sm:text-lg font-medium
          focus:outline-none transition-all duration-200
          ${isFocused
            ? 'ring-2 ring-opacity-20'
            : 'hover:opacity-95'}
        `}
        value={value}
        onChange={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
      />
      {isOpen && filtered.length > 0 && (
        <ul
          style={{
            background: 'var(--menu-bg)',
            borderColor: 'var(--menu-border)'
          }}
          className="absolute top-full left-0 right-0 border rounded-2xl mt-2 z-50 max-h-60 overflow-y-auto shadow-2xl overflow-hidden"
        >
          {filtered.map((suggestion, idx) => (
            <li
              key={idx}
              style={{
                color: 'var(--app-text)',
                borderColor: 'var(--card-border)'
              }}
              className="px-5 py-3.5 cursor-pointer text-base sm:text-lg font-medium transition-colors border-b last:border-0 hover:opacity-80"
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