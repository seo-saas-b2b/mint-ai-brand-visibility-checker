'use client';

import { useState } from 'react';
import { industries } from '@/lib/industries';
import CountrySelector from './CountrySelector';
import type { BrandInput } from '@/lib/types';

interface BrandInputFormProps {
  onSubmit: (data: BrandInput) => void;
}

export default function BrandInputForm({ onSubmit }: BrandInputFormProps) {
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!brandName.trim()) newErrors.brandName = 'Brand name is required';
    if (!industry) newErrors.industry = 'Industry is required';
    if (!country) newErrors.country = 'Country is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      brandName: brandName.trim(),
      industry,
      country,
      websiteUrl: websiteUrl.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="bg-white border border-border rounded-2xl p-6 md:p-8 space-y-5 shadow-sm">
        {/* Brand Name */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-1.5">
            Brand Name *
          </label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="e.g., Shopify, HubSpot, Nike..."
            className="w-full px-4 py-3 bg-bg-light border border-border rounded-xl text-text-dark placeholder-text-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          {errors.brandName && (
            <p className="mt-1 text-sm text-danger">{errors.brandName}</p>
          )}
        </div>

        {/* Website URL */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-1.5">
            Website URL
          </label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourbrand.com"
            className="w-full px-4 py-3 bg-bg-light border border-border rounded-xl text-text-dark placeholder-text-light focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Industry */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-1.5">
            Industry / Niche *
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full px-4 py-3 bg-bg-light border border-border rounded-xl text-text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none"
          >
            <option value="">Select your industry...</option>
            {industries.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.name}
              </option>
            ))}
          </select>
          {errors.industry && (
            <p className="mt-1 text-sm text-danger">{errors.industry}</p>
          )}
        </div>

        {/* Country */}
        <CountrySelector value={country} onChange={setCountry} />
        {errors.country && (
          <p className="-mt-3 text-sm text-danger">{errors.country}</p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-4 px-6 bg-primary text-white font-semibold text-lg rounded-xl hover:bg-primary-dark hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
        >
          Check AI Visibility
        </button>

        <p className="text-center text-xs text-text-light">
          No signup required · Free instant analysis
        </p>
      </div>
    </form>
  );
}
