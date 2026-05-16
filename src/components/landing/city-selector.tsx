'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_CITIES } from '@/lib/cities';

type Props = {
  locale: string;
  currentCity?: string;
  allCitiesLabel: string;
};

export function CitySelector({ locale, currentCity, allCitiesLabel }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(value: string) {
    const city = value === '__all__' ? undefined : value;
    const url = city ? `${pathname}?city=${encodeURIComponent(city)}` : pathname;
    router.push(url);
  }

  return (
    <div className="inline-flex items-center gap-2">
      <MapPin className="h-4 w-4 text-white/70" />
      <Select value={currentCity ?? '__all__'} onValueChange={handleChange}>
        <SelectTrigger
          className="h-9 w-auto min-w-[140px] rounded-full border-white/20 bg-white/10 text-sm text-white backdrop-blur-sm hover:bg-white/15 data-[placeholder]:text-white/70 [&_svg]:text-white/60"
        >
          <SelectValue placeholder={allCitiesLabel} />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value="__all__">{allCitiesLabel}</SelectItem>
          {SUPPORTED_CITIES.map((city) => (
            <SelectItem key={city.slug} value={city.slug}>
              {city.labels[locale] ?? city.labels.en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
