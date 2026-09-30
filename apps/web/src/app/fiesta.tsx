'use client';

import confetti from 'canvas-confetti';
import { useEffect } from 'react';

// Las celebraciones. Quien pidio menos movimiento no ve ninguna: el aviso ya
// dice lo que paso.

// Al marcar algo hecho: una rafaga corta desde abajo.
export function confeti() {
  void confetti({ particleCount: 90, spread: 70, origin: { y: 0.85 }, disableForReducedMotion: true });
}

// Los fuegos de fin de mes: mas del 90% de las tareas cumplidas en un mes ya
// cerrado. Una vez por mes y por navegador, en la primera pantalla que se abra
// despues del cierre.
export function FuegosDelMes({ mes, merece }: { mes: string; merece: boolean }) {
  useEffect(() => {
    if (!merece) return;
    const clave = `matriz:fuegos:${mes}`;
    try {
      if (localStorage.getItem(clave)) return;
      localStorage.setItem(clave, '1');
    } catch {
      // Sin almacenamiento (ventana privada) se celebra igual, solo que cada vez.
    }

    const hasta = Date.now() + 4000;
    const reloj = setInterval(() => {
      if (Date.now() > hasta) return clearInterval(reloj);
      for (const x of [0.2, 0.8]) {
        void confetti({
          particleCount: 45,
          startVelocity: 32,
          spread: 360,
          ticks: 70,
          origin: { x: x + (Math.random() - 0.5) * 0.2, y: Math.random() * 0.3 + 0.1 },
          disableForReducedMotion: true,
        });
      }
    }, 280);
    return () => clearInterval(reloj);
  }, [mes, merece]);

  return null;
}
