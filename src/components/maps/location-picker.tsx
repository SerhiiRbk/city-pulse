'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./map-view').then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="bg-muted flex h-[300px] items-center justify-center rounded-lg">Loading map...</div>,
});

interface LocationPickerProps {
  lat?: number;
  lng?: number;
  address?: string;
  onLocationChange: (data: { lat: number; lng: number; address: string; city?: string; country?: string }) => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
  };
}

export function LocationPicker({ lat, lng, address, onLocationChange }: LocationPickerProps) {
  const [query, setQuery] = useState(address || '');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null,
  );

  const searchAddress = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(q)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchAddress(query), 400);
    return () => clearTimeout(timer);
  }, [query, searchAddress]);

  function selectSuggestion(result: NominatimResult) {
    const newLat = parseFloat(result.lat);
    const newLng = parseFloat(result.lon);
    const city = result.address.city || result.address.town || result.address.village || '';
    const country = result.address.country || '';

    setPosition({ lat: newLat, lng: newLng });
    setQuery(result.display_name);
    setSuggestions([]);
    onLocationChange({ lat: newLat, lng: newLng, address: result.display_name, city, country });
  }

  async function handleMapClick(newLat: number, newLng: number) {
    setPosition({ lat: newLat, lng: newLng });

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const data: NominatimResult = await res.json();
      const city = data.address.city || data.address.town || data.address.village || '';
      const country = data.address.country || '';

      setQuery(data.display_name);
      onLocationChange({ lat: newLat, lng: newLng, address: data.display_name, city, country });
    } catch {
      onLocationChange({ lat: newLat, lng: newLng, address: '' });
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search address..."
            className="pl-9"
          />
          {isSearching && <Loader2 className="absolute top-3 right-3 h-4 w-4 animate-spin" />}
        </div>
        {suggestions.length > 0 && (
          <div className="bg-popover absolute z-50 mt-1 w-full rounded-md border shadow-lg">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="hover:bg-accent flex w-full items-start gap-2 px-3 py-2 text-left text-sm"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="line-clamp-2">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <MapComponent
        lat={position?.lat || 50.0755}
        lng={position?.lng || 14.4378}
        zoom={position ? 15 : 5}
        marker={position}
        onClick={handleMapClick}
      />
    </div>
  );
}
