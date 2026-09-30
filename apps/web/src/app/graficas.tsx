'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AZUL, DEVUELTA, FUNCION, VENCIDO } from './colores';

// Las graficas del tablero (CEB-215), con Recharts: tooltip al pasar, animacion
// al cargar y ancho que se adapta. Solo pintan: los datos llegan ya calculados
// del dominio (lib/tablero.ts) y ya acotados a lo que quien mira puede ver.

type Fila = { enlace: string | null; detalle: ReactNode };

// Lo comun a todas: barras horizontales apiladas, una fila por nombre, el
// tooltip con el detalle de la fila y el clic que lleva al perfil.
function Barras<T extends Fila>({
  filas,
  nombre,
  series,
  dominio,
  eje,
  marcas,
  ancho = 110,
}: {
  filas: readonly T[];
  nombre: (f: T) => string;
  series: readonly { clave: string; color: string; valor: (f: T) => number }[];
  dominio?: [number, number];
  eje?: (v: number) => string;
  marcas?: readonly number[];
  ancho?: number;
}) {
  const ir = useRouter();
  const datos = filas.map((f) => ({ ...f, _nombre: nombre(f), ...Object.fromEntries(series.map((s) => [s.clave, s.valor(f)])) }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(90, filas.length * 34 + 36)}>
      <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }} barCategoryGap={8}>
        <defs>
          {/* Lo que desplazo un imprevisto: el mismo color, rayado. */}
          <pattern id="rayado" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={FUNCION} />
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.75)" strokeWidth="2.5" />
          </pattern>
        </defs>
        <XAxis
          type="number"
          domain={dominio ?? [0, 'auto']}
          tickFormatter={eje}
          ticks={marcas as number[] | undefined}
          tick={{ fontSize: 11, fill: '#6e655a' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis type="category" dataKey="_nombre" width={ancho} tick={{ fontSize: 12.5, fill: '#1a1713' }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'rgba(26,23,19,0.05)' }} content={({ active, payload }) => (active && payload?.[0] ? <Globo>{(payload[0].payload as T).detalle}</Globo> : null)} />
        {series.map((s) => (
          <Bar
            key={s.clave}
            dataKey={s.clave}
            stackId="a"
            fill={s.color}
            stroke="#faf7f1"
            strokeWidth={2}
            maxBarSize={20}
            animationDuration={500}
            cursor="pointer"
            onClick={(d: { payload?: T }) => d.payload?.enlace && ir.push(d.payload.enlace)}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function Globo({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '8px 11px', boxShadow: '0 6px 20px rgba(26,23,19,0.16)', fontSize: 12.5, lineHeight: 1.45, color: '#1a1713', maxWidth: 280 }}>
      {children}
    </div>
  );
}

// Cuanto del cargo esta sin cumplir: cada persona, sus funciones que arrastran
// (lo desplazado rayado) y su cotidianidad sin cumplir, sobre el cien del cargo.
export type FilaSinCumplir = Fila & { nombre: string; funciones: readonly { propio: number; desplazado: number }[]; cotidianidad: number };

export function GraficaSinCumplir({ filas }: { filas: readonly FilaSinCumplir[] }) {
  const cuantas = Math.max(0, ...filas.map((f) => f.funciones.length));
  const series = Array.from({ length: cuantas }, (_, n) => [
    { clave: `f${n}`, color: FUNCION, valor: (f: FilaSinCumplir) => f.funciones[n]?.propio ?? 0 },
    { clave: `d${n}`, color: 'url(#rayado)', valor: (f: FilaSinCumplir) => f.funciones[n]?.desplazado ?? 0 },
  ]).flat();
  return (
    <Barras
      filas={filas}
      nombre={(f) => f.nombre}
      series={[...series, { clave: 'c', color: AZUL, valor: (f) => f.cotidianidad }]}
      dominio={[0, 100]}
      eje={(v) => `${v}%`}
    />
  );
}

// Desde cuando: cada funcion que arrastra es un tramo de su "desde" a hoy. La
// escala es fija (los ultimos noventa dias, o mas si algo es mas viejo): un dia
// se ve como un dia, no como la barra entera.
export type FilaDesdeCuando = Fila & { nombre: string; inicio: number; largo: number };

export function GraficaDesdeCuando({
  filas,
  dias,
  marcas,
}: {
  filas: readonly FilaDesdeCuando[];
  dias: number;
  // Las fechas del eje, ya escritas: una funcion no cruza del servidor al cliente.
  marcas: readonly { valor: number; texto: string }[];
}) {
  const texto = new Map(marcas.map((m) => [m.valor, m.texto]));
  return (
    <Barras
      filas={filas}
      nombre={(f) => f.nombre}
      series={[
        { clave: 'antes', color: 'transparent', valor: (f) => f.inicio },
        { clave: 'tramo', color: FUNCION, valor: (f) => f.largo },
      ]}
      dominio={[0, dias]}
      eje={(v) => texto.get(v) ?? ''}
      marcas={marcas.map((m) => m.valor)}
      ancho={150}
    />
  );
}

// Cuanto le cae para su tamano: imprevistos abiertos por cada 10% de su
// cotidianidad, en plazo y vencidos.
export type FilaCarga = Fila & { nombre: string; enPlazo: number; vencidos: number };

export function GraficaCarga({ filas }: { filas: readonly FilaCarga[] }) {
  return (
    <Barras
      filas={filas}
      nombre={(f) => f.nombre}
      series={[
        { clave: 'enPlazo', color: AZUL, valor: (f) => f.enPlazo },
        { clave: 'vencidos', color: VENCIDO, valor: (f) => f.vencidos },
      ]}
    />
  );
}

// Las mas delegadas: la parte de sus ocurrencias que se delego, y de eso lo
// devuelto.
export type FilaDelegada = Fila & { nombre: string; delegada: number; devuelta: number };

export function GraficaDelegadas({ filas }: { filas: readonly FilaDelegada[] }) {
  return (
    <Barras
      filas={filas}
      nombre={(f) => f.nombre}
      series={[
        { clave: 'delegada', color: AZUL, valor: (f) => f.delegada },
        { clave: 'devuelta', color: DEVUELTA, valor: (f) => f.devuelta },
      ]}
      dominio={[0, 100]}
      eje={(v) => `${v}%`}
      ancho={150}
    />
  );
}
