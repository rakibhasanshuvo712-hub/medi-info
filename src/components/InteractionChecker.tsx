import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import type { CatalogState } from '../types/pharma';

interface InteractionRule {
  pair: [string, string];
  severity: 'Major' | 'Moderate' | 'Minor';
  mechanism: string;
  guidance: string;
}

const CLINICAL_RULES: InteractionRule[] = [
  {
    pair: ['ketorolac', 'losartan'],
    severity: 'Major',
    mechanism: 'NSAIDs blunt ARB antihypertensive efficacy and reduce renal prostaglandin perfusion.',
    guidance: 'Avoid prolonged co-administration; monitor blood pressure and serum creatinine closely.',
  },
  {
    pair: ['ciprofloxacin', 'metronidazole'],
    severity: 'Moderate',
    mechanism: 'Additive risk of QT prolongation and GI/CNS adverse effects in susceptible patients.',
    guidance: 'Monitor ECG in patients with cardiac risk factors and watch for dizziness or GI distress.',
  },
  {
    pair: ['omeprazole', 'atorvastatin'],
    severity: 'Minor',
    mechanism: 'Competitive CYP2C19/CYP3A4 metabolism may modestly alter statin exposure.',
    guidance: 'Usually clinically insignificant; monitor for unusual muscle aches.',
  },
  {
    pair: ['esomeprazole', 'metformin'],
    severity: 'Minor',
    mechanism: 'Long-term PPI therapy combined with metformin may compound Vitamin B12 malabsorption.',
    guidance: 'Consider periodic Vitamin B12 monitoring during chronic co-therapy.',
  },
  {
    pair: ['azithromycin', 'atorvastatin'],
    severity: 'Moderate',
    mechanism: 'Macrolides can increase systemic statin exposure and myopathy risk.',
    guidance: 'Advise patient to report unexplained muscle pain or weakness during short antibiotic courses.',
  },
  {
    pair: ['azithromycin', 'salbutamol'],
    severity: 'Moderate',
    mechanism: 'Both agents may prolong QT interval or cause mild additive hypokalemia at high doses.',
    guidance: 'Use caution in patients with underlying arrhythmias or baseline hypokalemia.',
  },
  {
    pair: ['ciprofloxacin', 'paracetamol'],
    severity: 'Minor',
    mechanism: 'No major pharmacokinetic interaction at standard therapeutic doses.',
    guidance: 'Safe to co-administer; maintain adequate hydration.',
  },
  {
    pair: ['ketorolac', 'paracetamol'],
    severity: 'Moderate',
    mechanism: 'Concurrent analgesic therapy increases hepatic/renal monitoring burden if dehydrated.',
    guidance: 'Limit ketorolac to ≤5 days and avoid exceeding 4 g/day of paracetamol.',
  },
];

interface InteractionCheckerProps {
  catalog: CatalogState;
}

export function InteractionChecker({ catalog }: InteractionCheckerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(['ketorolac', 'losartan']);
  const [pickId, setPickId] = useState<string>(catalog.generics[0]?.id ?? 'paracetamol');

  const genericMap = useMemo(
    () => new Map(catalog.generics.map((g) => [g.id, g])),
    [catalog.generics],
  );

  const addGeneric = () => {
    if (pickId && !selectedIds.includes(pickId)) {
      setSelectedIds((prev) => [...prev, pickId]);
    }
  };

  const removeGeneric = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const detectedInteractions = useMemo(() => {
    const found: { a: string; b: string; rule: InteractionRule }[] = [];
    for (let i = 0; i < selectedIds.length; i++) {
      for (let j = i + 1; j < selectedIds.length; j++) {
        const idA = selectedIds[i];
        const idB = selectedIds[j];
        const match = CLINICAL_RULES.find(
          (r) =>
            (r.pair[0] === idA && r.pair[1] === idB) ||
            (r.pair[0] === idB && r.pair[1] === idA),
        );
        if (match) {
          found.push({ a: idA, b: idB, rule: match });
        }
      }
    }
    return found;
  }, [selectedIds]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Drug Interaction Checker
        </h1>
        <p className="text-sm text-slate-500">
          Select two or more generics to screen for potential clinical interactions and guidance.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
          >
            {catalog.generics.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.therapeuticClass})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addGeneric}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <Plus className="h-4 w-4" />
            Add Medicine
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const g = genericMap.get(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900"
              >
                {g?.name ?? id}
                <button
                  type="button"
                  onClick={() => removeGeneric(id)}
                  className="text-teal-700 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {selectedIds.length < 2 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Add at least two generics above to check for interactions.
        </div>
      ) : detectedInteractions.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <div className="font-bold">No Major Curated Interactions Flagged</div>
            <p className="mt-1 text-xs text-emerald-800">
              No flagged interactions found among the selected generics in the MedPulse screening
              matrix. Always review individual generic Interaction sections before prescribing.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {detectedInteractions.map(({ a, b, rule }) => {
            const nameA = genericMap.get(a)?.name ?? a;
            const nameB = genericMap.get(b)?.name ?? b;
            const isMajor = rule.severity === 'Major';
            return (
              <div
                key={`${a}-${b}`}
                className={`rounded-xl border p-5 ${
                  isMajor
                    ? 'border-rose-200 bg-rose-50/50'
                    : rule.severity === 'Moderate'
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    {isMajor ? (
                      <ShieldAlert className="h-5 w-5 text-rose-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    )}
                    <span>
                      {nameA} + {nameB}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isMajor
                        ? 'bg-rose-100 text-rose-800'
                        : rule.severity === 'Moderate'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {rule.severity} Interaction
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  <strong>Mechanism:</strong> {rule.mechanism}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  <strong>Clinical Guidance:</strong> {rule.guidance}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
