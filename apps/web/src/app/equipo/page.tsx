import { notFound, redirect } from 'next/navigation';
import { delFiltro } from '@matriz/dominio';
import { enPalabras, filtroDe, pertenencias, type ParametrosDelFiltro } from '@/lib/pertenencia';
import { Filtrar } from '../filtro';
import { esAdministrador } from '@/lib/administrador';
import { loDeMiGente, type PersonaACargo } from '@/lib/supervisor';
import { barrasDe, cargasDe, lineasDelArrastre, masDelegadas } from '@/lib/tablero';
import { lasDelegaciones } from '@/lib/equipo';
import { DEL_SUPERVISOR, Navegacion } from '../navegacion';
import { salir } from '../acciones';
import { perfiles } from '../perfil';
import { Punto } from '../abrir';
import { Ir } from '../ir';
import { Carga, DesdeCuando, MasDelegadas, Resumen, SinCumplir } from '../tablero';

// El equipo (CEB-215): el mismo tablero que ve el administrador, con su gente
// y sin montos (ADR 0015). Debajo, la lista de personas: cada una lleva a su
// perfil (equipo/[persona]), donde esta el detalle.
export default async function TuGente({ searchParams }: { searchParams: Promise<ParametrosDelFiltro> }) {
  if (await esAdministrador()) redirect('/admin');

  const parametros = await searchParams;
  const [{ hoy, calendario, datos, gente: todos }, { opciones, deIds }, { sinLeerDe }, delegaciones] = await Promise.all([
    loDeMiGente(),
    pertenencias(),
    perfiles(undefined),
    lasDelegaciones(true),
  ]);
  // Quien no supervisa no tiene esta pantalla: un 404, como en /admin.
  if (todos.length === 0) notFound();

  // El filtro acota lo que lo_de_mi_gente ya devolvio: nunca trae a nadie que
  // no este a su cargo (INV-29).
  const filtro = filtroDe(parametros);
  const gente = todos
    .map((p) => ({ ...p, ...deIds(p.empresaId, p.sedeId) }))
    .filter((p) => delFiltro(p, p.funciones, (f) => f.texto, filtro) !== null);
  const quienes = new Set(gente.map((p) => p.id));
  const barras = barrasDe(datos, hoy, calendario).filter((b) => quienes.has(b.persona.id));
  const lineas = lineasDelArrastre(datos, hoy, calendario).filter((l) => quienes.has(l.persona.id));
  const cargas = cargasDe(datos, hoy).filter((c) => quienes.has(c.persona.id));
  // Las que el delega: son funciones suyas, y su perfil no es de esta pantalla.
  const repetidas = masDelegadas(delegaciones, hoy, calendario);

  return (
    <>
      <Navegacion entradas={DEL_SUPERVISOR} salida={salir} />
      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>El equipo 👥</h1>

        <Filtrar opciones={opciones} valores={parametros} />

        <Resumen barras={barras} lineas={lineas} cargas={cargas} />
        <div className="tablero">
          <SinCumplir barras={barras} perfilDe={(id) => `/equipo/${id}`} />
          <DesdeCuando lineas={lineas} hoy={hoy} perfilDe={(id) => `/equipo/${id}`} />
          <Carga cargas={cargas} perfilDe={(id) => `/equipo/${id}`} />
          <MasDelegadas repetidas={repetidas} />
        </div>

        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '6px 0 0' }}>Las personas</h2>
        {gente.length === 0 && <p style={{ color: 'var(--gris)', fontSize: 14, margin: 0 }}>Nadie de tu equipo coincide con el filtro.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {gente.map((p) => (
            <Ir key={p.id} href={`/equipo/${p.id}`} style={PERSONA}>
              <span style={{ flexGrow: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>
                {p.nombre}
                {/* Comentarios sin leer en alguna de sus tareas abiertas (CEB-198). */}
                {sinLeerDe(p.id) && <Punto />}
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--gris)', marginLeft: 10 }}>{enPalabras(p)}</span>
              </span>
              <span style={{ fontSize: 13, ...(pendientes(p) ? { color: '#9E3322', fontWeight: 600 } : { color: 'var(--gris)' }) }}>
                {resumenDe(p)}
              </span>
            </Ir>
          ))}
        </div>
      </main>
    </>
  );
}

const pendientes = (p: Pick<PersonaACargo, 'funciones'>) => p.funciones.filter((f) => f.atraso || f.arrastre?.periodos).length;

function resumenDe(p: Pick<PersonaACargo, 'funciones' | 'imprevistos'>): string {
  const n = pendientes(p);
  const abiertos = p.imprevistos.filter((i) => !i.resultado).length;
  const partes = [
    n ? `${n} ${n === 1 ? 'función sin cumplirse' : 'funciones sin cumplirse'}` : 'todo al día',
    abiertos ? `${abiertos} ${abiertos === 1 ? 'imprevisto abierto' : 'imprevistos abiertos'}` : '',
  ];
  return partes.filter(Boolean).join(' · ');
}

const PERSONA = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '4px 14px',
  background: 'var(--suave)',
  borderRadius: 14,
  padding: '12px 16px',
  color: 'var(--tinta)',
  textDecoration: 'none',
} as const;
