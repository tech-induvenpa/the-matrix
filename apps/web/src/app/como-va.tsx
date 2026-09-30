import { fechaCorta } from '@/lib/datos';
import type { ComoVaUnaFuncion } from '@/lib/tablero';

// Como va una funcion, dicho en su fila del reparto (CEB-219): igual en el
// perfil del administrador y en la pagina del supervisor. El arrastre en
// tiempo: el numero compara, la fecha dice si ya es grave. Al dia no dice
// nada, para que lo que si dice algo salte a la vista.
export function comoVa(f: Pick<ComoVaUnaFuncion, 'arrastre' | 'atraso'>): string | null {
  if (f.atraso) return `🐢 atrasado desde el ${fechaCorta(f.atraso.desde)}${f.atraso.razon ? `: “${f.atraso.razon}”` : ''}`;
  if (f.arrastre?.periodos) {
    const { periodos, desde } = f.arrastre;
    return `arrastra ${periodos} ${periodos === 1 ? 'periodo' : 'periodos'}, desde el ${fechaCorta(desde!)}`;
  }
  return null;
}

export function ComoVa({ f }: { f?: Pick<ComoVaUnaFuncion, 'arrastre' | 'atraso'> }) {
  const texto = f ? comoVa(f) : null;
  if (!texto) return null;
  return <span style={ESTADO}>{texto}</span>;
}

const ESTADO = { fontSize: 12.5, fontWeight: 600, color: '#9E3322', overflowWrap: 'anywhere' } as const;
