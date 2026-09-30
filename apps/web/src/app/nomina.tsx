import { conceptoDe } from '@matriz/dominio';
import { dolares } from '@/lib/datos';
import { nombreDelMes, type NominaDelMes } from '@/lib/nomina';
import { enCaracas } from '@/lib/cierre-del-mes';

// La nomina como estado de cuenta (ADR 0016): el bono, un descuento por cada
// parte del cargo que no se cumplio entera, y el total a pagar. La misma para
// el empleado en "El mes" y para el administrador en el perfil. Solo pinta: la
// cuenta es del dominio.
export function EstadoDeCuenta({ datos }: { datos: NominaDelMes & { nomina: NonNullable<NominaDelMes['nomina']> } }) {
  const { nomina, estado } = datos;
  const cerrado = estado.estado === 'cerrado';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ ...ETIQUETA, background: cerrado ? 'rgba(26,23,19,0.08)' : '#FBE3B8' }}>
        {cerrado ? 'Mes cerrado' : 'Provisional: se mueve con cada marca hasta el cierre'}
      </span>
      <div style={FILA}>
        <span>Bono de {nombreDelMes(datos.mes)}</span>
        <span style={MONTO}>{dolares(nomina.bono, { centavos: true })}</span>
      </div>
      {nomina.lineas.map((l, i) => (
        <div key={i} style={{ ...FILA, color: '#9E3322' }}>
          <span>− {conceptoDe(l)}</span>
          <span style={MONTO}>−{dolares(l.descuento, { centavos: true })}</span>
        </div>
      ))}
      <div style={{ ...FILA, fontWeight: 700, borderTop: '1px solid rgba(26,23,19,0.14)', paddingTop: 6 }}>
        <span>= Total a pagar</span>
        <span style={MONTO}>{dolares(nomina.total, { centavos: true })}</span>
      </div>
      {/* Las correcciones tambien se ven (CEB-232): cada reapertura, en orden. */}
      {datos.reaperturas.map((r) => (
        <p key={r.en} style={REAPERTURA}>
          Se reabrió el {enCaracas(r.en)} ({r.quien}): “{r.razon}”.{' '}
          {r.recierre.como === 'a_mano'
            ? `Se volvió a cerrar a mano el ${enCaracas(r.recierre.en)}.`
            : r.recierre.como === 'solo'
              ? `Se volvió a cerrar solo el ${enCaracas(r.recierre.en)}, a las veinticuatro horas.`
              : `Sigue reabierto hasta el ${enCaracas(r.recierre.en)}.`}{' '}
          {r.antes === null
            ? `Total a pagar después: ${dolares(r.despues, { centavos: true })}.`
            : r.antes === r.despues
              ? `El total no cambió: ${dolares(r.despues, { centavos: true })}.`
              : `Total a pagar antes: ${dolares(r.antes, { centavos: true })}; después: ${dolares(r.despues, { centavos: true })}.`}
        </p>
      ))}
    </div>
  );
}

// Los ultimos doce meses, para elegir cual ver.
export const ultimosMeses = (hoy: string) =>
  Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7) - 1 - i, 1));
    return {
      valor: d.toISOString().slice(0, 7),
      texto: new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d),
    };
  });

const REAPERTURA = { fontSize: 12.5, color: 'var(--gris)', margin: '6px 0 0', lineHeight: 1.4 } as const;

const FILA = { display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13.5, lineHeight: 1.35 } as const;

const MONTO = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontWeight: 600 } as const;

const ETIQUETA = {
  alignSelf: 'flex-start',
  fontSize: 11.5,
  fontWeight: 600,
  borderRadius: 999,
  padding: '3px 10px',
  marginBottom: 4,
} as const;
