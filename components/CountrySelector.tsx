'use client';

import { useState, useRef, useEffect } from 'react';
import { countries } from '@/lib/countries';
import type { Country } from '@/lib/types';

interface CountrySelectorProps {
  value: string;
  onChange: (code: string) => void;
}

export default function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = countries.find((c) => c.code === value);

  const filtered = search
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : countries;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!value) {
      fetch('https://ipapi.co/json/')
        .then((r) => r.json())
        .then((data) => {
          if (data.country_code) {
            const match = countries.find((c) => c.code === data.country_code);
            if (match) onChange(match.code);
          }
        })
        .catch(() => onChange('US'));
    }
  }, []);

  function handleSelect(country: Country) {
    onChange(country.code);
    setSearch('');
    setIsOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-text-dark mb-1.5">
        Country *
      </label>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full flex items-center gap-2 px-4 py-3 bg-bg-light border border-border rounded-xl text-text-dark text-left hover:bg-gray-100 transition-colors"
      >
        {selected ? (
          <>
            <span className="text-lg">{selected.flag}</span>
            <span>{selected.name}</span>
          </>
        ) : (
          <span className="text-text-light">Select country...</span>
        )}
        <svg
          className={`ml-auto w-4 h-4 transition-transform text-text-muted ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries..."
              className="w-full px-3 py-2 bg-bg-light border border-border rounded-lg text-text-dark text-sm placeholder-text-light focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleSelect(c)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-bg-light transition-colors ${
                  c.code === value ? 'bg-primary/5 text-primary font-medium' : 'text-text-dark'
                }`}
              >
                <span className="text-lg">{c.flag}</span>
                <span>{c.name}</span>
                <span className="ml-auto text-xs text-text-light">{c.code}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-text-muted">No countries found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
