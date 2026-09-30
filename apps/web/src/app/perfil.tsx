import type { ReactNode } from 'react';
import { lineaDeTiempo, loLeen, sinLeer, type EventoDelPerfil, type TareaDelPerfil } from '@matriz/dominio';
import { claveDeOcurrencia, losComentarios, type FilaComentario } from '@/lib/comentarios';
import { fechaCorta, hoyISO } from '@/lib/datos';
import { comentar } from './acciones';
import { Accion } from './accion';
import { Enviar } from './boton';
import { AbrirPerfil, AlAbrir } from './abrir';

// El perfil de la tarea (CEB-198): la tarjeta crece en su lugar y cuenta su
// historia. Lo que cada tarjeta necesita para abrirlo.
export type Perfil = { clave: string; sinLeer: boolean; contenido: ReactNode };

// Una lectura por pagina. `abierta` es la clave que trae la URL.
export async function perfiles(abierta: string | undefined) {
  const { yo, porTarea, vistoEn, lectores } = await losComentarios(abierta);
  const hoy = hoyISO();

  const perfil = (clave: string, tarea: TareaDelPerfil): Perfil => {
    const comentarios = porTarea.get(clave) ?? [];
    return {
      clave,
      sinLeer: sinLeer(comentarios.map(comoComentario), vistoEn.get(clave) ?? null, yo, tarea.marca !== null),
      contenido: abierta === clave ? <PerfilDeTarea clave={clave} tarea={tarea} comentarios={comentarios} lectores={lectores} hoy={hoy} /> : null,
    };
  };

  // Una ocurrencia, con su marca si la tiene.
  const deOcurrencia = (
    o: { funcionId: string; periodo: string; vence: string },
    m?: { resultado: 'hecho' | 'no_pude'; razon: string | null; marcada_en: string },
  ) =>
    perfil(claveDeOcurrencia(o.funcionId, o.periodo), {
      tipo: 'ocurrencia',
      vence: o.vence,
      marca: m ? { resultado: m.resultado, razon: m.razon, marcadaEn: m.marcada_en } : null,
    });

  // El punto junto al nombre: algo sin leer en alguna tarea abierta de hoy de esa persona.
  const sinLeerDe = (empleadoId: string) =>
    [...porTarea].some(
      ([clave, cs]) =>
        cs[0]?.empleado_id === empleadoId &&
        sinLeer(cs.map(comoComentario), vistoEn.get(clave) ?? null, yo, !cs[0].abierta),
    );

  return { perfil, deOcurrencia, sinLeerDe };
}

const comoComentario = (c: FilaComentario) => ({ autor: c.autor, autorNombre: c.autor_nombre, escritoEn: c.escrito_en, texto: c.texto });

// El texto de una tarjeta que abre su perfil. Sin perfil, solo el texto.
export function Titulo({ perfil, children }: { perfil?: Perfil; children: ReactNode }) {
  if (!perfil) return <>{children}</>;
  return (
    <AbrirPerfil clave={perfil.clave} sinLeer={perfil.sinLeer}>
      {children}
    </AbrirPerfil>
  );
}

function PerfilDeTarea({
  clave,
  tarea,
  comentarios,
  lectores,
  hoy,
}: {
  clave: string;
  tarea: TareaDelPerfil;
  comentarios: readonly FilaComentario[];
  lectores: readonly string[];
  hoy: string;
}) {
  const eventos = lineaDeTiempo(tarea, comentarios.map(comoComentario), hoy);

  return (
    <div style={PANEL}>
      <AlAbrir clave={clave} />
      {/* Arriba, junto a lo ultimo que se dijo. Marcada, solo se lee: lo que se
          dijo antes de la marca no cambia despues. */}
      {!tarea.marca && (
        <Accion accion={comentar.bind(null, clave)} style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <textarea name="texto" required rows={2} placeholder="Escribe un comentario" aria-label="Comentario" style={CAJA} />
          <Enviar style={BOTON} enviando="…">
            Comentar
          </Enviar>
        </Accion>
      )}
      <p style={{ margin: 0, fontSize: 12, color: 'var(--gris)' }}>{loLeen(lectores)}</p>
      {eventos.length === 0 && <p style={{ margin: 0, color: 'var(--gris)', fontSize: 13.5 }}>Todavía nadie ha dicho nada.</p>}
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {eventos.map((e, n) => (
          <li key={n} style={{ display: 'flex', gap: 9, alignItems: 'baseline', fontSize: 13.5, lineHeight: 1.4 }}>
            <span aria-hidden style={{ flexShrink: 0 }}>{e.emoji}</span>
            <span style={{ flexGrow: 1, minWidth: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{enPalabras(e)}</span>
            <span style={{ fontSize: 12, color: 'var(--gris)', whiteSpace: 'nowrap' }}>{fechaCorta(e.cuando.slice(0, 10))}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function enPalabras(e: EventoDelPerfil): ReactNode {
  switch (e.tipo) {
    case 'pedido':
      return `Lo pidió ${e.quien}`;
    case 'delegado':
      return `Lo delegó ${e.quien}`;
    case 'devuelto':
      return `Devuelto por ${e.quien}: “${e.texto}”`;
    case 'comentario':
      return (
        <>
          <strong>{e.quien}</strong>: {e.texto}
        </>
      );
    case 'vencio':
      return 'Venció sin marca';
    case 'hecho':
      return 'Hecho';
    case 'no_pude':
      return `No pude: “${e.texto}”`;
    case 'no_lo_tome':
      return `No lo tomé: “${e.texto}”`;
  }
}

const PANEL = {
  flexBasis: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  background: '#FFFDF8',
  color: 'var(--tinta)',
  borderRadius: 14,
  padding: '12px 14px',
  cursor: 'auto',
} as const;

const CAJA = {
  flexGrow: 1,
  minWidth: 0,
  borderRadius: 12,
  border: '1px solid rgba(26,23,19,0.14)',
  padding: '8px 12px',
  font: 'inherit',
  fontSize: 14,
  resize: 'vertical',
} as const;

const BOTON = {
  display: 'flex',
  alignItems: 'center',
  height: 34,
  padding: '0 14px',
  borderRadius: 999,
  background: 'var(--tinta)',
  color: '#ffffff',
  fontSize: 13.5,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
} as const;
