// Pasa el agente por las funciones que YA estan en la base (CEB-114):
//
//   pnpm retipificar              -> dice que propondria, no toca nada
//   pnpm retipificar --confirmar  -> lo guarda
//
// El importador tipifica las filas nuevas; esto es para cuando cambia el
// modelo, o cuando hay funciones que entraron sin tipo. Escribe solo los
// campos _generado: lo que una persona haya corregido en _corregido sigue
// mandando y no se toca.
import { createClient } from '@supabase/supabase-js';
import { interpretar } from '@matriz/dominio';
import { tipificadorRemoto } from './tipificador.mts';
import { entorno } from './entorno.mts';

const confirmar = process.argv.includes('--confirmar');
const soloSinTipo = process.argv.includes('--solo-sin-tipo');


const supabase = createClient(entorno('NEXT_PUBLIC_SUPABASE_URL'), entorno('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

const agente = tipificadorRemoto({
  clave: entorno('AGENTE_API_KEY'),
  modelo: entorno('AGENTE_MODELO'),
  url: entorno('AGENTE_URL'),
});

const consulta = supabase.from('funcion').select('id, texto, tipo_generado, dia_tope_generado').eq('activa', true);
const { data: funciones } = await (soloSinTipo ? consulta.is('tipo_generado', null) : consulta);

console.log(`\n${funciones?.length} funciones, con ${entorno('AGENTE_MODELO')}\n`);

// ponytail: de ocho en ocho. Ni una cola de trabajos ni ochenta peticiones a la vez.
const LOTE = 8;
const cambios: { id: string; texto: string; antes: string | null; tipo: string; diaTope: number | null }[] = [];
const rechazadas: { texto: string; motivo: string }[] = [];

for (let i = 0; i < (funciones ?? []).length; i += LOTE) {
  const lote = (funciones ?? []).slice(i, i + LOTE);
  const propuestas = await Promise.all(
    lote.map(async (f) => {
      try {
        return { f, veredicto: interpretar(await agente.proponer(f.texto)) };
      } catch (fallo) {
        return { f, error: (fallo as Error).message };
      }
    }),
  );

  for (const p of propuestas) {
    if ('error' in p) {
      rechazadas.push({ texto: p.f.texto, motivo: p.error!.slice(0, 60) });
      continue;
    }
    if (!p.veredicto.acepta) {
      rechazadas.push({ texto: p.f.texto, motivo: p.veredicto.motivo });
      continue;
    }
    const diaTope = p.veredicto.diaTope ?? null;
    if (p.veredicto.tipo !== p.f.tipo_generado || diaTope !== p.f.dia_tope_generado)
      cambios.push({ id: p.f.id, texto: p.f.texto, antes: p.f.tipo_generado, tipo: p.veredicto.tipo, diaTope });
  }
  process.stdout.write(`  ${Math.min(i + LOTE, (funciones ?? []).length)}/${funciones?.length}\r`);
}

console.log(`\n${cambios.length} cambios de tipo:\n`);
for (const c of cambios.slice(0, 25))
  console.log(`  ${(c.antes ?? 'sin tipo').padEnd(11)} → ${c.tipo.padEnd(11)}${c.diaTope ? `día ${String(c.diaTope).padEnd(3)}` : '      '} ${c.texto.slice(0, 44)}`);
if (cambios.length > 25) console.log(`  … y ${cambios.length - 25} más`);

if (rechazadas.length) {
  console.log(`\n${rechazadas.length} sin tipo, fuera del plan hasta que alguien las mire:`);
  for (const r of rechazadas.slice(0, 10)) console.log(`  ? ${r.texto.slice(0, 44).padEnd(46)} ${r.motivo}`);
}

if (!confirmar) {
  console.log('\nNada se guardó. Repite con --confirmar.\n');
  process.exit(0);
}

for (const c of cambios) {
  const { error } = await supabase
    .from('funcion')
    .update({ tipo_generado: c.tipo, dia_tope_generado: c.diaTope })
    .eq('id', c.id);
  if (error) throw error;
}
console.log(`\nGuardados ${cambios.length} tipos.\n`);
