import { notFound, redirect } from 'next/navigation';
import { delFiltro } from '@matriz/dominio';
import { enPalabras, filtroDe, pertenencias, type ParametrosDelFiltro } from '@/lib/pertenencia';
import { Filtrar } from '../filtro';
import { esAdministrador } from '@/lib/administrador';
import { loDeMiGente, type PersonaACargo } from '@/lib/supervisor';
import { barrasDe, cargasDe, imprevistosQueSeBuscan, lineasDelArrastre, masDelegadas } from '@/lib/tablero';
import { lasDelegaciones } from '@/lib/equipo';
import { DEL_SUPERVISOR, Navegacion } from '../navegacion';
import { salir } from '../acciones';
import { perfiles } from '../perfil';
import { AcordeonDePersona, enlacesDe, Pestanas, vistaDe } from '../personas';
import { tareasAbiertasDe } from '@/lib/tareas';
import { claveDeLaTarea, ListaDeTareas } from '../lista';
import { Carga, DesdeCuando, MasDelegadas, Resumen, SinCumplir } from '../tablero';

// El equipo (CEB-215): las mismas dos pestanas que el administrador (personas
// y tablero), con su gente y sin montos (ADR 0015). Cada persona es un
// acordeon con sus tareas abiertas y un atajo a su perfil (equipo/[persona]).
export default async function TuGente({ searchParams }: { searchParams: Promise<ParametrosDelFiltro & { vista?: string; tarea?: string }> }) {
  if (await esAdministrador()) redirect('/admin');

  const { vista: pedida, tarea, ...parametros } = await searchParams;
  const vista = vistaDe(pedida);
  const [{ hoy, calendario, datos, gente: todos, quienesPiden }, { opciones, deIds }, conPerfil, delegaciones] = await Promise.all([
    loDeMiGente(),
    pertenencias(),
    // El perfil abierto de una tarea (su historia), si hay uno en la URL.
    perfiles(tarea),
    lasDelegaciones(true),
  ]);
  const { sinLeerDe } = conPerfil;
  // Quien no supervisa no tiene esta pantalla: un 404, como en /admin.
  if (todos.length === 0) notFound();

  // El filtro acota lo que lo_de_mi_gente ya devolvio: nunca trae a nadie que
  // no este a su cargo (INV-29).
  const filtro = filtroDe(parametros);
  const gente = todos
    .map((p) => ({ ...p, ...deIds(p.empresaId, p.sedeId) }))
    .filter((p) => delFiltro(p, [...p.funciones.map((f) => f.texto), ...imprevistosQueSeBuscan(datos, p.id, hoy)], (t) => t, filtro) !== null);
  const quienes = new Set(gente.map((p) => p.id));
  const barras = barrasDe(datos, hoy, calendario).filter((b) => quienes.has(b.persona.id));
  const lineas = lineasDelArrastre(datos, hoy, calendario).filter((l) => quienes.has(l.persona.id));
  const cargas = cargasDe(datos, hoy).filter((c) => quienes.has(c.persona.id));
  // Las que el delega: son funciones suyas, y su perfil no es de esta pantalla.
  const repetidas = masDelegadas(delegaciones, hoy, calendario);
  // Las tareas abiertas de cada quien, solo en la pestana de personas.
  // ponytail: una lectura por persona; un equipo es de pocas.
  const tareas = new Map(vista === 'equipo' ? await Promise.all(gente.map(async (p) => [p.id, await tareasAbiertasDe(p.id, hoy, calendario)] as const)) : []);
  // Buscando por texto, los acordeones se abren: lo buscado puede ser una tarea.
  const abiertos = Boolean(parametros.q);

  return (
    <>
      <Navegacion entradas={DEL_SUPERVISOR} salida={salir} />
      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>El equipo 👥</h1>

        <Pestanas vista={vista} enlaceA={enlacesDe(parametros)} />

        <Filtrar opciones={opciones} valores={parametros} conservar={{ vista: vista === 'tablero' ? 'tablero' : undefined }} />

        {vista === 'tablero' && (
          <>
            <Resumen barras={barras} lineas={lineas} cargas={cargas} />
            <div className="tablero">
              <SinCumplir barras={barras} perfilDe={(id) => `/equipo/${id}`} />
              <DesdeCuando lineas={lineas} hoy={hoy} perfilDe={(id) => `/equipo/${id}`} />
              <Carga cargas={cargas} perfilDe={(id) => `/equipo/${id}`} />
              <MasDelegadas repetidas={repetidas} />
            </div>
          </>
        )}

        {vista === 'equipo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gente.length === 0 && <p style={{ color: 'var(--gris)', fontSize: 14, margin: 0 }}>Nadie de tu equipo coincide con el filtro.</p>}
            {gente.map((p) => (
              <AcordeonDePersona
                key={p.id}
                nombre={p.nombre}
                empresa={enPalabras(p)}
                sinLeer={sinLeerDe(p.id)}
                // Un solo nivel: quien esta a cargo de un supervisor no supervisa.
                aCargo={0}
                abierto={abiertos || (tareas.get(p.id) ?? []).some((t) => claveDeLaTarea(t) === tarea)}
                perfil={`/equipo/${p.id}`}
                tareasAbiertas={tareas.get(p.id)?.length ?? 0}
                datos={<span style={{ fontSize: 13, ...(pendientes(p) ? { color: '#9E3322', fontWeight: 600 } : { color: 'var(--gris)' }) }}>{resumenDe(p)}</span>}
              >
                <ListaDeTareas
                  lista={tareas.get(p.id) ?? []}
                  hoy={hoy}
                  calendario={calendario}
                  quienesPiden={quienesPiden}
                  perfiles={conPerfil}
                  puedeBorrar={() => false}
                />
              </AcordeonDePersona>
            ))}
          </div>
        )}
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

