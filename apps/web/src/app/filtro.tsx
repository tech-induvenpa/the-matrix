import type { Opcion } from '@matriz/dominio';
import type { ParametrosDelFiltro } from '@/lib/pertenencia';
import { Ir } from './ir';

// El filtro del equipo (CEB-184): empresa o sede en un solo desplegable, y un
// texto que busca persona, empresa o funcion. Un formulario GET: el filtro vive
// en la direccion, se comparte y sobrevive a recargar, sin JavaScript.
export function Filtrar({
  opciones,
  valores,
  conservar = {},
}: {
  opciones: Opcion[];
  valores: ParametrosDelFiltro;
  // Otros parametros de la pagina que el filtro no debe perder (Razones).
  conservar?: Record<string, string | undefined>;
}) {
  const filtrando = Boolean(valores.en || valores.q);
  return (
    <form method="get" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {Object.entries(conservar).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <select name="en" defaultValue={valores.en ?? ''} aria-label="Empresa o sede" style={CAMPO}>
        <option value="">Todas las empresas</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      <input
        name="q"
        type="search"
        defaultValue={valores.q ?? ''}
        placeholder="Buscar persona, empresa o función"
        aria-label="Buscar"
        style={{ ...CAMPO, flexGrow: 1, minWidth: 200 }}
      />
      <button type="submit" style={BOTON}>
        Filtrar
      </button>
      {filtrando && (
        <Ir href={`?${new URLSearchParams(Object.entries(conservar).filter((e): e is [string, string] => Boolean(e[1])))}`} style={{ fontSize: 12.5, color: 'var(--gris)' }}>
          quitar filtro
        </Ir>
      )}
    </form>
  );
}

const CAMPO = {
  height: 36,
  borderRadius: 10,
  border: '1px solid rgba(26,23,19,0.18)',
  padding: '0 10px',
  fontSize: 14,
  background: '#fff',
} as const;

const BOTON = {
  height: 36,
  padding: '0 16px',
  borderRadius: 999,
  background: 'var(--tinta)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
} as const;
