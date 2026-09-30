import {
  arrastreDe,
  barrasDelEquipo,
  cargaDeImprevistos,
  cumplimientoDeLaHolgura,
  delegacionRepetida,
  estadosVigentes,
  ocurrenciasEntre,
  periodosDesplazados,
  VENTANA_DE_DELEGACION,
  type Arrastre,
  type Calendario,
} from '@matriz/dominio';
import type { DatosDelEquipo, DelegacionDelEquipo, FuncionQueSeDelega } from './equipo';

// Lo que se calcula sobre lo que se lee de la gente (lib/equipo.ts), igual
// para el administrador y el supervisor. Sin lecturas: solo el dominio, asi lo
// usan tambien las pruebas de trazador con lo que devuelve la base.

export type ComoVaUnaFuncion = {
  id: string;
  texto: string;
  periodicidad: string;
  tipo: string | null;
  ponderacion: number;
  // Un entregable arrastra; un flujo esta al dia o atrasado desde una fecha,
  // con su razon vigente. Un area no se mide: ninguna de las dos.
  arrastre: Arrastre | null;
  atraso: { desde: string; razon: string | null } | null;
  // Cuantos periodos de su arrastre tienen un "no pude" vinculado a un
  // imprevisto (intromision).
  desplazados: number;
};

// Como va cada funcion de una persona, ahora mismo.
export function comoVanSusFunciones(datos: DatosDelEquipo, empleadoId: string, hoy: string, calendario: Calendario): ComoVaUnaFuncion[] {
  const vigentes = new Map(
    estadosVigentes(
      datos.eventos.map((e) => ({ funcionId: e.funcion_id, estado: e.estado, razon: e.razon ?? undefined, en: e.en })),
    ).map((e) => [e.funcionId, e]),
  );
  const vinculadas = new Set(datos.intromisiones.map((x) => x.marca_id));

  return datos.funciones
    .filter((f) => f.empleado_id === empleadoId)
    .map((f): ComoVaUnaFuncion => {
      const base = {
        id: f.id,
        texto: f.texto,
        periodicidad: f.periodicidad,
        tipo: f.tipo,
        ponderacion: f.ponderacion,
        arrastre: null,
        atraso: null,
        desplazados: 0,
      };
      if (f.tipo === 'flujo') {
        const v = vigentes.get(f.id);
        // El atraso empieza con el primer "atrasado" despues del ultimo "al dia";
        // la razon es la del ultimo que se declaro.
        if (v?.estado !== 'atrasado') return base;
        const ultimoAlDia = datos.eventos.filter((e) => e.funcion_id === f.id && e.estado === 'al_dia').at(-1)?.en ?? '';
        const primero = datos.eventos.find((e) => e.funcion_id === f.id && e.estado === 'atrasado' && e.en > ultimoAlDia);
        return { ...base, atraso: { desde: (primero ?? v).en.slice(0, 10), razon: v.razon ?? null } };
      }
      if (f.tipo !== 'entregable') return base;
      // El arrastre de quien la tiene hoy empieza cuando empezo a tenerla. Solo
      // "hecho" cumple: un "no pude" no corta el arrastre.
      const ocurrencias = ocurrenciasEntre(
        { periodicidad: f.periodicidad, diaTope: f.dia_tope ?? undefined, fechaAlta: f.fecha_alta },
        calendario,
        f.desde,
        hoy,
      );
      const suyas = datos.marcas.filter((m) => m.funcion_id === f.id);
      const arrastre = arrastreDe(ocurrencias, suyas.filter((m) => m.resultado === 'hecho'), hoy);
      const conVinculo = new Set(suyas.filter((m) => m.resultado === 'no_pude' && vinculadas.has(m.id)).map((m) => m.periodo));
      return { ...base, arrastre, desplazados: periodosDesplazados(ocurrencias, arrastre, conVinculo, hoy) };
    });
}

// Lo que el filtro de texto encuentra de una persona ademas de sus funciones:
// sus imprevistos abiertos y los que cerro este mes. Los borrados no.
// ponytail: sale de lo que ya se leyo para el tablero (abiertos y pedidos en
// los ultimos dos meses); uno pedido hace mas y cerrado este mes no aparece.
export function imprevistosQueSeBuscan(datos: DatosDelEquipo, empleadoId: string, hoy: string): string[] {
  const mes = hoy.slice(0, 7);
  return datos.imprevistos
    .filter((i) => i.empleado_id === empleadoId && !i.borrado_en && (!i.resultado || (i.marcada_en ?? '').slice(0, 7) === mes))
    .map((i) => i.texto);
}

export type PersonaDelTablero = { id: string; nombre: string; empresa: string | null; sede: string | null };

// Cuanto del cargo de cada quien esta sin cumplir (CEB-221). La cotidianidad
// se mide con los imprevistos del mes en curso: se cumple por mes, como el bono.
export function barrasDe(datos: DatosDelEquipo, hoy: string, calendario: Calendario) {
  const mes = { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
  return barrasDelEquipo(
    datos.gente.map((p) => ({
      persona: { id: p.id, nombre: p.nombre, empresa: p.empresa, sede: p.sede } as PersonaDelTablero,
      funciones: comoVanSusFunciones(datos, p.id, hoy, calendario).flatMap((f) =>
        f.arrastre ? [{ funcionId: f.id, texto: f.texto, ponderacion: f.ponderacion, arrastre: f.arrastre, desplazados: f.desplazados }] : [],
      ),
      cotidianidad: p.cotidianidad,
      imprevistos: cumplimientoDeLaHolgura(
        datos.imprevistos
          .filter((i) => i.empleado_id === p.id)
          .map((i) => ({ vence: i.vence, resultado: i.resultado, borradoEn: i.borrado_en ?? null, devueltoEn: i.devuelto_en })),
        mes,
        hoy,
      ),
    })),
  );
}

// La carga de imprevistos (CEB-223): los abiertos de cada persona por cada 10%
// de su cotidianidad, de la mas cargada a la menos. Quien no tiene nada
// abierto no ocupa espacio.
export function cargasDe(datos: DatosDelEquipo, hoy: string) {
  return datos.gente
    .map((p) => ({
      persona: { id: p.id, nombre: p.nombre },
      cotidianidad: p.cotidianidad,
      carga: cargaDeImprevistos(
        datos.imprevistos
          .filter((i) => i.empleado_id === p.id)
          .map((i) => ({ vence: i.vence, resultado: i.resultado, borradoEn: i.borrado_en ?? null })),
        p.cotidianidad,
        hoy,
      ),
    }))
    .filter((c) => c.carga.total > 0)
    .sort((a, b) => b.carga.total - a.carga.total || a.persona.nombre.localeCompare(b.persona.nombre));
}

// Las funciones mas delegadas (CEB-224), en proporcion a sus ocurrencias de la
// ventana. Las ocurrencias cuentan desde que su titular de hoy la tiene: lo
// delegado por otro titular no es suyo.
export function masDelegadas(
  { funciones, delegaciones }: { funciones: readonly FuncionQueSeDelega[]; delegaciones: readonly DelegacionDelEquipo[] },
  hoy: string,
  calendario: Calendario,
) {
  const desde = new Date(Date.parse(`${hoy}T00:00:00Z`) - VENTANA_DE_DELEGACION * 864e5).toISOString().slice(0, 10);
  const delegadas = new Set(delegaciones.map((d) => d.funcion_id));
  return delegacionRepetida(
    funciones
      .filter((f) => delegadas.has(f.id))
      .map((f) => ({
        funcionId: f.id,
        texto: f.texto,
        supervisor: f.titular,
        ocurrencias: ocurrenciasEntre(
          { periodicidad: f.periodicidad, diaTope: f.dia_tope ?? undefined, fechaAlta: f.fecha_alta },
          calendario,
          f.desde > desde ? f.desde : desde,
          hoy,
        ),
      })),
    delegaciones.map((d) => ({
      funcionId: d.funcion_id,
      periodo: d.periodo,
      pedidoEn: d.pedido_en,
      devueltoEn: d.devuelto_en,
      borradoEn: d.borrado_en,
    })),
    hoy,
  );
}

// La linea del arrastre (CEB-222): cada funcion con arrastre es un tramo desde
// que empezo hasta hoy. Una capa fina sobre el arrastre: quien no arrastra no
// ocupa espacio, y lo mas viejo va primero, que es lo que mas salta.
export function lineasDelArrastre(datos: DatosDelEquipo, hoy: string, calendario: Calendario) {
  return datos.gente
    .map((p) => ({
      persona: { id: p.id, nombre: p.nombre },
      tramos: comoVanSusFunciones(datos, p.id, hoy, calendario)
        .flatMap((f) =>
          f.arrastre?.periodos && f.arrastre.desde
            ? [{ funcionId: f.id, texto: f.texto, periodos: f.arrastre.periodos, desde: f.arrastre.desde }]
            : [],
        )
        .sort((a, b) => a.desde.localeCompare(b.desde) || a.texto.localeCompare(b.texto)),
    }))
    .filter((p) => p.tramos.length > 0)
    .sort((a, b) => a.tramos[0]!.desde.localeCompare(b.tramos[0]!.desde) || a.persona.nombre.localeCompare(b.persona.nombre));
}
