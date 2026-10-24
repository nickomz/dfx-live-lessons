# DFX Live Lessons

App web estática para crear lecciones que se ven dentro de Ableton Live. El brief completo está en `docs/BRIEF.md`: leelo antes de empezar cualquier fase.

## Cómo trabajar conmigo

- Respondé en español rioplatense, directo y sin relleno. Explicá el porqué de las decisiones importantes, no cada paso.
- Antes de cada fase, mostrame el plan. Dentro de una fase, avanzá sin pedir confirmación en cada paso.
- Si algo del brief no funciona o tiene un problema, decímelo antes de ejecutar en vez de forzarlo.
- No soy programador: cuando necesites que haga algo yo (en GitHub, en la Mac, en Live), decime exactamente qué y dónde.

## Reglas del proyecto

- Sin backend, sin login, sin APIs con clave. Nada sale de la compu del usuario.
- Solo se ofrecen en el editor los formatos que Live realmente muestra. La referencia es `docs/formato.md` (lo genera la Fase 0).
- El parser y el serializador del formato `Lessons*.txt` tienen tests y hacen round-trip sin pérdida. No se rompe un test para avanzar.
- Lo que el brief marca como v2 no se implementa, aunque parezca fácil.
- Toda verificación en Live la hacés vos con el control de la compu, con capturas. No me pidas que pruebe salvo que no tengas acceso.

## Git

- Un commit por cada avance que funcione, con mensaje en español que explique qué cambió.
- Push a GitHub al cerrar cada fase.
