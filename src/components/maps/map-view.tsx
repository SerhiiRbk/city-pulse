'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { STADIA_ATTRIBUTION, buildStadiaTileUrl } from '@/lib/maps/stadia';

interface MapViewProps {
  lat: number;
  lng: number;
  zoom?: number;
  marker?: { lat: number; lng: number } | null;
  onClick?: (lat: number, lng: number) => void;
  className?: string;
}

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function MapView({ lat, lng, zoom = 13, marker, onClick, className }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([lat, lng], zoom);

    L.tileLayer(buildStadiaTileUrl(), {
      attribution: STADIA_ATTRIBUTION,
      maxZoom: 20,
    }).addTo(map);

    if (onClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (marker) {
      markerRef.current = L.marker([marker.lat, marker.lng], { icon: defaultIcon }).addTo(map);
    }
  }, [marker]);

  return (
    <div
      ref={mapRef}
      className={className || 'h-[300px] w-full rounded-lg border'}
      style={{ isolation: 'isolate', position: 'relative', zIndex: 0 }}
    />
  );
}
