"use client";
import {SegmentedField} from '../ui/navigation';

// Chips de período compartidos (guía §3): Hoy · 7 d · 30 d · 90 d · Mes actual ·
// Mes anterior. Un solo control para Resumen y Uso; el rango se muestra en días
// de Asunción junto con el período anterior de igual duración.

import {dayLabel} from "./usage-charts";
import {PLATFORM_PERIODS, periodRange, type PlatformPeriodId} from "./period";

export function PlatformPeriodChips({value, onChange}: {value: PlatformPeriodId; onChange: (next: PlatformPeriodId) => void}) {
  const {from, to} = periodRange(value);
  return <div className="platform-period" data-toolbar="periodo">
    <div className="platform-period-chips silent-scroll">
      <SegmentedField className="w-max flex-nowrap [&>button]:min-h-11 [&>button]:whitespace-nowrap md:[&>button]:min-h-8" value={value} onChange={(next: string) => onChange(next as PlatformPeriodId)} ariaLabel="Período" options={PLATFORM_PERIODS}/>
    </div>
    <small className="platform-period-range" title="Días de Asunción; cada indicador se compara con el período anterior de igual duración">{from === to ? dayLabel(from) : `${dayLabel(from)} → ${dayLabel(to)}`} · vs período anterior</small>
  </div>;
}
