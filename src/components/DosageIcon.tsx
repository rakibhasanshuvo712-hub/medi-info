import {
  Droplets,
  FlaskConical,
  Pill,
  Sparkles,
  Syringe,
  Tablets,
  Wind,
} from 'lucide-react';
import type { DosageForm } from '../types/pharma';

interface DosageIconProps {
  form: DosageForm;
  className?: string;
}

export function DosageIcon({ form, className = 'h-4 w-4' }: DosageIconProps) {
  switch (form) {
    case 'Tablet':
      return <Tablets className={`${className} text-sky-600`} />;
    case 'Capsule':
      return <Pill className={`${className} text-indigo-600`} />;
    case 'Syrup':
    case 'Suspension':
      return <FlaskConical className={`${className} text-amber-600`} />;
    case 'Injection':
      return <Syringe className={`${className} text-rose-600`} />;
    case 'Inhaler':
      return <Wind className={`${className} text-teal-600`} />;
    case 'Drops':
      return <Droplets className={`${className} text-cyan-600`} />;
    default:
      return <Sparkles className={`${className} text-slate-600`} />;
  }
}
