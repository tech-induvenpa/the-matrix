import type { Fecha } from './calendario';
import type { Arrastre } from './arrastre';
import type { Ocurrencia } from './ocurrencias';

// Cuanto del cargo de cada persona esta sin cumplir ahora mismo (CEB-221): la
// primera grafica del tablero del equipo. Una barra por persona con su
// ponderacion arrastrada, partida en un segmento por funcion con arrastre y
// uno de cotidianidad. Dentro de cada segmento, lo que desplazo un imprevisto
// vinculado (intromision): la misma barra dice "35% sin cumplir, y 15% de eso
// lo desplazo lo no planificado". Pesos, nunca montos: los montos se calculan
// aparte y solo para el administrador (ADR 0015).

export type FuncionDeLaBarra = {
  funcionId: string;
  texto: string;
  ponderacion: number;
  arrastre: Arrastre;
  // Cuantos periodos de su arrastre tienen un "no pude" vinculado a un imprevisto.
  desplazados: number;
};

export type Segmento =
  | { tipo: 'funcion'; funcionId: string; texto: string; peso: number; desplazado: number }
  | { tipo: 'cotidianidad'; peso: number; desplazado: number };

export type Barra<P> = { persona: P; segmentos: Segmento[]; total: number; desplazado: number };

export function barrasDelEquipo<P extends { nombre: string }>(
  personas: readonly {
    persona: P;
    funciones: readonly FuncionDeLaBarra[];
    cotidianidad: number;
    // El cumplimiento de sus imprevistos (cumplimientoDeLaHolgura).
    imprevistos: { esperados: number; sinCumplir: number };
  }[],
): Barra<P>[] {
  return personas
    .map(({ persona, funciones, cotidianidad, imprevistos }) => {
      // Una funcion pesa entera o no pesa: arrastra o no. De su peso, lo
      // desplazado es la parte de sus periodos arrastrados que se vinculo a un
      // imprevisto, y por eso nunca excede su segmento.
      const deFunciones: Segmento[] = funciones
        .filter((f) => f.arrastre.periodos > 0 && f.ponderacion > 0)
        .map((f) => ({
          tipo: 'funcion' as const,
          funcionId: f.funcionId,
          texto: f.texto,
          peso: f.ponderacion,
          desplazado: (f.ponderacion * Math.min(f.desplazados, f.arrastre.periodos)) / f.arrastre.periodos,
        }))
        .sort((a, b) => b.peso - a.peso || a.texto.localeCompare(b.texto));

      // La cotidianidad se cumple con imprevistos hechos sobre los esperados;
      // un mes sin esperados no cuenta en contra. Es lo que queda del cargo:
      // con ella la barra llega a lo sumo a cien.
      const enFunciones = deFunciones.reduce((t, s) => t + s.peso, 0);
      const resto = Math.max(0, Math.min(cotidianidad, 100 - enFunciones));
      const pesoCotidiano = imprevistos.esperados > 0 ? (resto * imprevistos.sinCumplir) / imprevistos.esperados : 0;
      const segmentos = pesoCotidiano > 0 ? [...deFunciones, { tipo: 'cotidianidad' as const, peso: pesoCotidiano, desplazado: 0 }] : deFunciones;

      return {
        persona,
        segmentos,
        total: segmentos.reduce((t, s) => t + s.peso, 0),
        desplazado: segmentos.reduce((t, s) => t + s.desplazado, 0),
      };
    })
    .sort((a, b) => b.total - a.total || a.persona.nombre.localeCompare(b.persona.nombre));
}

// Los periodos de un arrastre cuyo "no pude" se vinculo a un imprevisto. El
// arrastre son las ultimas ocurrencias vencidas sin cumplir: las que vencen
// desde su `desde` hasta hoy.
export function periodosDesplazados(
  ocurrencias: readonly Ocurrencia[],
  arrastre: Arrastre,
  vinculados: ReadonlySet<string>,
  hoy: Fecha,
): number {
  if (!arrastre.desde) return 0;
  return ocurrencias.filter((o) => o.vence >= arrastre.desde! && o.vence <= hoy && vinculados.has(o.periodo)).length;
}
