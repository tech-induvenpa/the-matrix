import { describe, expect, it } from 'vitest';
import { Calendario } from '../src/calendario';
import { haySinLeer, lineaDeTiempo, listaDeTareas, loLeen, sinLeer, type TareaDelPerfil } from '../src/perfil';

const hoy = '2026-09-16'; // miercoles
const comentario = (autorNombre: string, escritoEn: string, texto = 'algo') => ({
  autor: autorNombre.toLowerCase(),
  autorNombre,
  escritoEn,
  texto,
});
const tipos = (t: TareaDelPerfil, cs = [comentario('Ana', '2026-09-14T10:00:00Z')]) =>
  lineaDeTiempo(t, cs, hoy).map((e) => `${e.emoji} ${e.tipo}`);

describe('la linea de tiempo del perfil', () => {
  it('una ocurrencia no tiene evento de nacimiento: empieza con su primer comentario', () => {
    expect(tipos({ tipo: 'ocurrencia', vence: '2026-09-20', marca: null })).toEqual(['💬 comentario']);
  });

  it('lo mas reciente arriba, con autor y texto en cada comentario', () => {
    const eventos = lineaDeTiempo(
      { tipo: 'ocurrencia', vence: '2026-09-20', marca: null },
      [comentario('Benito', '2026-09-15T09:00:00Z', 'segundo'), comentario('Ana', '2026-09-14T09:00:00Z', 'primero')],
      hoy,
    );
    expect(eventos.map((e) => [e.quien, e.texto])).toEqual([
      ['Benito', 'segundo'],
      ['Ana', 'primero'],
    ]);
  });

  it('⏰ solo si vencio sin marca, al final de su dia', () => {
    const vencida = lineaDeTiempo(
      { tipo: 'ocurrencia', vence: '2026-09-14', marca: null },
      [comentario('Ana', '2026-09-14T18:00:00Z'), comentario('Ana', '2026-09-15T08:00:00Z')],
      hoy,
    );
    expect(vencida.map((e) => e.emoji)).toEqual(['💬', '⏰', '💬']);
    expect(vencida.map((e) => e.cuando.slice(0, 10))).toEqual(['2026-09-15', '2026-09-14', '2026-09-14']);

    // Todavia no vence, o vence hoy: nada.
    expect(tipos({ tipo: 'ocurrencia', vence: hoy, marca: null })).toEqual(['💬 comentario']);
    // Marcada, aunque sea tarde: la marca cuenta la historia.
    expect(
      tipos({ tipo: 'ocurrencia', vence: '2026-09-14', marca: { resultado: 'hecho', razon: null, marcadaEn: '2026-09-15T12:00:00Z' } }),
    ).toEqual(['✅ hecho', '💬 comentario']);
  });

  it('la marca va primero, con su razon', () => {
    const eventos = lineaDeTiempo(
      { tipo: 'ocurrencia', vence: '2026-09-20', marca: { resultado: 'no_pude', razon: 'sin sistema', marcadaEn: '2026-09-15T12:00:00Z' } },
      [comentario('Ana', '2026-09-14T10:00:00Z')],
      hoy,
    );
    expect(eventos[0]).toEqual({ tipo: 'no_pude', emoji: '❌', cuando: '2026-09-15T12:00:00Z', texto: 'sin sistema' });
  });

  const imprevisto = {
    tipo: 'imprevisto' as const,
    vence: '2026-09-17',
    pedidoPor: 'Jefa',
    pedidoEn: '2026-09-13T08:00:00Z',
    delegacion: false,
    devolucion: null,
    marca: null,
  };

  it('un imprevisto empieza con quien lo pidio', () => {
    expect(lineaDeTiempo(imprevisto, [], hoy)).toEqual([{ tipo: 'pedido', emoji: '📥', quien: 'Jefa', cuando: '2026-09-13T08:00:00Z' }]);
  });

  it('una delegacion con quien la delego, y si viene de una devuelta, la razon', () => {
    expect(tipos({ ...imprevisto, delegacion: true })).toEqual(['💬 comentario', '🤝 delegado']);
    const eventos = lineaDeTiempo(
      { ...imprevisto, delegacion: true, devolucion: { por: 'Ana', razon: 'falta la firma', en: '2026-09-13T08:00:00Z' } },
      [],
      hoy,
    );
    expect(eventos.map((e) => [e.emoji, e.texto])).toEqual([
      ['🤝', undefined],
      ['↩️', 'falta la firma'],
    ]);
  });

  it('🙅 para lo que no se tomo', () => {
    expect(
      tipos({ ...imprevisto, marca: { resultado: 'no_lo_tome', razon: 'no es mio', marcadaEn: '2026-09-15T00:00:00Z' } }, []),
    ).toEqual(['🙅 no_lo_tome', '📥 pedido']);
  });
});

describe('sin leer', () => {
  const de = (autor: string, escritoEn: string) => ({ autor, escritoEn });

  it('un comentario de otro posterior a la vista, si; anterior, no', () => {
    expect(sinLeer([de('s', '2026-09-15T10:00:00Z')], '2026-09-15T09:00:00Z', 'a', false)).toBe(true);
    expect(sinLeer([de('s', '2026-09-15T08:00:00Z')], '2026-09-15T09:00:00Z', 'a', false)).toBe(false);
  });

  it('lo propio nunca cuenta; nunca abierto con algo de otro, si', () => {
    expect(sinLeer([de('a', '2026-09-15T10:00:00Z')], null, 'a', false)).toBe(false);
    expect(sinLeer([de('s', '2026-09-15T10:00:00Z')], null, 'a', false)).toBe(true);
    expect(sinLeer([], null, 'a', false)).toBe(false);
  });

  it('una tarea marcada no tiene nada sin leer', () => {
    expect(sinLeer([de('s', '2026-09-15T10:00:00Z')], null, 'a', true)).toBe(false);
  });

  it('el punto junto al nombre: alguna de sus tareas', () => {
    const leida = { comentarios: [de('s', '2026-09-15T08:00:00Z')], vistoEn: '2026-09-15T09:00:00Z', marcada: false };
    const nueva = { comentarios: [de('s', '2026-09-15T10:00:00Z')], vistoEn: null, marcada: false };
    expect(haySinLeer([leida], 'j')).toBe(false);
    expect(haySinLeer([leida, nueva], 'j')).toBe(true);
    expect(haySinLeer([{ ...nueva, marcada: true }], 'j')).toBe(false);
  });
});

describe('la lista por persona', () => {
  const calendario = Calendario.con([]);
  const ocurrencia = (texto: string, vence: string, importancia: number, marcada = false, ponderacion = 10) => ({
    texto,
    vence,
    importancia,
    marcada,
    ponderacion,
  });
  const imprevisto = (
    texto: string,
    vence: string,
    resultado: 'hecho' | null = null,
    borradoEn: string | null = null,
    importancia = 0,
  ) => ({
    texto,
    vence,
    importancia,
    resultado,
    borradoEn,
  });
  const textos = (l: { tarea: { texto: string } }[]) => l.map((t) => t.tarea.texto);

  it('mezcla ocurrencias e imprevistos, solo abiertos, incluidos los vencidos', () => {
    const lista = listaDeTareas(
      [ocurrencia('Cierre', '2026-09-30', 5), ocurrencia('Hecha', '2026-09-17', 9, true), ocurrencia('Vencida', '2026-09-10', 3)],
      [imprevisto('Llamar al banco', '2026-09-17'), imprevisto('Marcado', '2026-09-16', 'hecho'), imprevisto('Borrado', '2026-09-16', null, 'x')],
      hoy,
      calendario,
    );
    expect(textos(lista)).toEqual(['Vencida', 'Llamar al banco', 'Cierre']);
  });

  it('por urgencia y luego importancia; en un empate, el imprevisto va despues', () => {
    const lista = listaDeTareas(
      [ocurrencia('Poca', '2026-09-17', 2), ocurrencia('Mucha', '2026-09-17', 8)],
      [imprevisto('Imprevisto', '2026-09-17')],
      hoy,
      calendario,
    );
    expect(textos(lista)).toEqual(['Mucha', 'Poca', 'Imprevisto']);
  });

  it('el imprevisto cuenta con su importancia real, no con 0', () => {
    const lista = listaDeTareas(
      [ocurrencia('Poca', '2026-09-17', 2), ocurrencia('Mucha', '2026-09-17', 8)],
      [imprevisto('Informe al directorio', '2026-09-17', null, null, 9), imprevisto('Tramite', '2026-09-17', null, null, 5)],
      hoy,
      calendario,
    );
    expect(textos(lista)).toEqual(['Informe al directorio', 'Mucha', 'Tramite', 'Poca']);
    expect(lista.map((t) => t.importancia)).toEqual([9, 8, 5, 2]);
  });

  it('la ponderacion no altera el orden', () => {
    const a = ocurrencia('A', '2026-09-24', 5, false, 90);
    const b = ocurrencia('B', '2026-09-24', 5, false, 1);
    expect(textos(listaDeTareas([a, b], [], hoy, calendario))).toEqual(['A', 'B']);
    expect(textos(listaDeTareas([{ ...a, ponderacion: 1 }, { ...b, ponderacion: 90 }], [], hoy, calendario))).toEqual(['A', 'B']);
  });
});

describe('quien lo lee', () => {
  it('nombra al circulo y siempre al administrador', () => {
    expect(loLeen(['BENITO', 'ANA'])).toBe('Lo leen: BENITO, ANA y el administrador');
    expect(loLeen([])).toBe('Lo lee el administrador');
  });
});
