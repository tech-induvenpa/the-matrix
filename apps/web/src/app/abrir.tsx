'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { verTarea } from './acciones';

// El perfil abierto vive en la URL (`?tarea=`): uno a la vez, se comparte con
// un link y sobrevive a recargar. Se conservan los demas parametros, como el
// filtro del equipo.
function conTarea(parametros: URLSearchParams, clave: string | null) {
  const nuevos = new URLSearchParams(parametros);
  if (clave) nuevos.set('tarea', clave);
  else nuevos.delete('tarea');
  return `?${nuevos}`;
}

// El texto de la tarjeta abre su perfil; otro clic lo cierra. El punto es lo
// que no has leido.
export function AbrirPerfil({ clave, sinLeer, children }: { clave: string; sinLeer: boolean; children: ReactNode }) {
  const parametros = useSearchParams();
  const abierto = parametros.get('tarea') === clave;

  return (
    <Link
      href={conTarea(parametros, abierto ? null : clave)}
      scroll={false}
      aria-expanded={abierto}
      title={abierto ? 'Cerrar el perfil' : 'Ver su historia y comentarla'}
      style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
    >
      {children}
      {sinLeer && <Punto />}
    </Link>
  );
}

// Verde, como el de la esquina de las tarjetas (NuevoMensaje), con un borde
// blanco para que se lea sobre cualquier color.
export function Punto() {
  return (
    <span
      role="img"
      aria-label="comentarios sin leer"
      title="Comentarios sin leer"
      style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        borderRadius: 999,
        background: '#2E9E5B',
        border: '2px solid #fff',
        boxShadow: '0 1px 3px rgba(26,23,19,0.2)',
        marginLeft: 7,
        verticalAlign: 'middle',
      }}
    />
  );
}

// Montado dentro del perfil abierto: registra que lo viste y lo cierra con Esc.
// Depende de la clave y no de una accion atada: esa cambia en cada render y
// volveria a registrar sin fin.
export function AlAbrir({ clave }: { clave: string }) {
  const router = useRouter();
  const donde = usePathname();
  const parametros = useSearchParams();

  useEffect(() => {
    void verTarea(clave);
  }, [clave]);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.replace(`${donde}${conTarea(parametros, null)}`, { scroll: false });
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [router, donde, parametros]);

  return null;
}

// El mismo abrir y cerrar que el titulo, como boton al final de la tarjeta: un
// chevron que gira cuando la historia esta abierta.
export function BotonDeHistoria({ clave, velo }: { clave: string; velo: string }) {
  const parametros = useSearchParams();
  const abierto = parametros.get('tarea') === clave;

  return (
    <Link
      href={conTarea(parametros, abierto ? null : clave)}
      scroll={false}
      aria-expanded={abierto}
      aria-label={abierto ? 'Cerrar su historia' : 'Ver su historia'}
      title={abierto ? 'Cerrar su historia' : 'Ver su historia y comentarla'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 999,
        background: velo,
        color: 'inherit',
        flexShrink: 0,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        style={{ transform: abierto ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s ease' }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </Link>
  );
}
