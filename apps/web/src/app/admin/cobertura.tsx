import type { Cobertura } from '@matriz/dominio';
import Link from 'next/link';

// Es la unica alarma del sistema cuyo modo de fallo es silencioso: cuando el
// calendario se agota, no se calculan fechas mas alla del horizonte para no
// inventarlas, asi que los planes empiezan a vaciarse y parece que no hay
// trabajo. Por eso es un estado permanente de la pantalla y no una
// notificacion: se va cuando se carga mas calendario, y no antes.
export function AvisoDeCobertura({
  cobertura,
  cargadoHasta,
  enlazar = false,
}: {
  cobertura: Cobertura;
  cargadoHasta: string;
  enlazar?: boolean;
}) {
  if (cobertura.estado === 'ok') return null;

  const { fondo, borde, titulo, nota } = COMO_SE_VE(cobertura, cargadoHasta);

  return (
    <div style={{ background: fondo, borderLeft: `4px solid ${borde}`, borderRadius: 14, padding: '14px 18px' }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{titulo}</div>
      <div style={{ fontSize: 13.5, marginTop: 3, lineHeight: 1.45 }}>
        {nota}
        {enlazar && (
          <>
            {' '}
            <Link href="/admin/calendario" style={{ color: 'inherit', fontWeight: 600 }}>
              Cargar más calendario →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function COMO_SE_VE(cobertura: Cobertura, cargadoHasta: string) {
  const quedan = `Quedan ${cobertura.habilesRestantes} días hábiles revisados, hasta el ${cargadoHasta}.`;

  switch (cobertura.estado) {
    case 'sin_cobertura':
      return {
        fondo: '#FBE9E5',
        borde: '#D9503A',
        titulo: 'El calendario se acabó',
        nota: `${quedan} Por debajo de esto no se calculan vencimientos, así que hay planes vaciándose ahora mismo.`,
      };
    case 'aviso_30':
      return {
        fondo: '#FBE9E5',
        borde: '#E37B3C',
        titulo: 'Al calendario le queda muy poco',
        nota: `${quedan} Cuando se acabe, los planes se vacían sin avisar y parece que no hay trabajo.`,
      };
    default:
      return {
        fondo: '#FAF3E2',
        borde: '#E8A33F',
        titulo: 'Toca cargar el calendario del año que viene',
        nota: `${quedan} Son dos gestos: los feriados y el bloque de colectivas.`,
      };
  }
}
