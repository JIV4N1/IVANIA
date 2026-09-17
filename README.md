# IVANIA · prototipo web local

React + TypeScript vive en `frontend/`, con Vite y su propio package-lock. El núcleo sigue siendo CommonJS/NodeNext en `src/`. El servidor usa `node:http` y crea una sola configuración de Ana y Sofía al arrancar, compartida por todas las solicitudes. El navegador no ejecuta el motor. Los textos breve y completo provienen de `ActivitySummaryPresenter` en el servidor.

## Arranque en Windows

Desde `C:\IVANIA`, instalar una vez (o tras actualizar dependencias):

```powershell
npm.cmd ci
npm.cmd --prefix frontend ci
```

Terminal 1, backend (sin reinicio automático):

```powershell
npm.cmd run server
```

Terminal 2, frontend:

```powershell
npm.cmd run frontend
```

Abrir **http://127.0.0.1:5173**. Backend: `127.0.0.1:3001`. Ambos escuchan únicamente en loopback. Vite hace proxy de `/api` al backend; no hay CORS abierto. Usar Node compatible con Vite (20.19+ o 22.12+; verificado con 24.11.0). No se requieren herramientas globales.

## Ciclo de uso

1. Elegir Ana o Sofía y registrar salida al momento del servidor.
2. Avanzar 5 minutos, 1 hora u 8 horas con los controles de desarrollo.
3. Consultar regreso. El servidor captura un corte y obtiene `(última conexión, corte]` con límite 8.
4. Alternar breve/completo sin repetir la consulta. La política elegida se aplica a la próxima consulta. Avanzar el reloj no sustituye el resultado mostrado.
5. Confirmar el resultado: se envía su `agentId` y su `to`, incluso si el reloj ya avanzó. Los eventos posteriores permanecen disponibles para la siguiente consulta.

Cambiar de agente limpia la vista sin confirmar. Registrar otra salida reemplaza explícitamente el inicio de ausencia y limpia el resultado visible. Una respuesta tardía de otro agente no se presenta ni se puede confirmar bajo el agente actual. Tras confirmar, el botón queda deshabilitado para ese resultado. Otra pestaña puede cambiar el estado compartido: el servidor rechaza confirmaciones que retrocedan el registro.

## Contrato HTTP

JSON; POST requiere `Content-Type: application/json`, máximo 8 KiB. Sin caché. Los momentos tienen `{day,hour,minute}` (día entero desde 1, horas 0–23, minutos múltiplos de 5 entre 0–55).

| Método / ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| GET `/api/state` | — | `{moment, agents:[{id,name,locationId,location,lastConnection}]}`; registro ausente: `null` |
| POST `/api/advance` | `{minutes:5\|60\|480}` | Estado visible actualizado; ticks calculados con `MINUTES_PER_TICK` del núcleo |
| POST `/api/departure` | `{agentId}` | Registra el reloj actual; devuelve estado visible |
| POST `/api/return` | `{agentId,selectionPolicy:"important"\|"balanced"}` | `{status:"ready",result,presentation:{brief,complete},state}`; `result` es el resultado acotado existente sin cambios |
| POST `/api/return` sin registro | mismo cuerpo | `{status:"no-connection",agentId,state}`; distinto a un resultado válido con cero items |
| POST `/api/confirm` | `{agentId,to:{day,hour,minute}}` | `{confirmedAt,state}` |

Errores: `{error:"mensaje"}`, sin stack traces. 400 para entradas/JSON inválidos o cortes futuros; 409 para confirmación sin salida o retroceso; 413 para cuerpos demasiado grandes; 415 para tipo de contenido incorrecto; 403 para origen no permitido; 404 para ruta/método desconocido. No se aceptan cortes futuros ni agentes desconocidos. Todas las validaciones preceden a la mutación. Consultar nunca confirma, borra ni consume eventos.

## Verificación y demos

```powershell
npm.cmd run build
npm.cmd run build:frontend
npm.cmd test
npm.cmd run test:http
npm.cmd --prefix frontend run test:map
npm.cmd run demo:activity -- --scenario diurno
npm.cmd run demo:activity -- --scenario nocturno
npm.cmd run demo:activity -- --scenario varios-dias --selection balanced
npm.cmd run demo:activity-session
npm.cmd run demo:activity-two-agents
```

Los comandos originales de desarrollo, build, pruebas y demos se conservan. `test:http` levanta un servidor real en un puerto loopback efímero y lo cierra al terminar.

## Límites

Estado exclusivamente en memoria: recargar el navegador conserva el mundo pero descarta la vista local del resumen; reiniciar el servidor reinicia reloj, mundo, eventos y registros. Avance únicamente manual, sin timers de simulación, polling, sincronización continua, WebSockets ni dependencia de la presencia del navegador. No hay autenticación: es un prototipo para la máquina local. La confirmación es explícita, sin sesiones, tokens ni almacenamiento de consultas. La interfaz se actualiza al cargar y tras cada acción, no al actuar desde otra pestaña. Colyseus queda para otro incremento.

## Escena Phaser

Phaser 4.2.1 representa Casa (`home`), Cafetería (`cafe`) y Trabajo (`work`) mediante Graphics y texto, sin assets externos. `locationId` se añade al DTO conservando el nombre legible `location`. Las coordenadas son exclusivamente visuales y están en `frontend/src/world/worldLayout.ts`. Ana y Sofía tienen slots fijos por ID; un ID de ubicación desconocido utiliza el área «Ubicación no representada».

`WorldMap` carga Phaser de forma diferida y crea un puente local por montaje. React envía agentes y selección; la escena retiene el último estado hasta `create()` y repinta instantáneamente. No consulta HTTP, importa el motor ni avanza ticks. El bucle de render de Phaser no cambia ubicaciones. El resumen conserva su propio intervalo histórico aunque el mapa reciba un estado actual nuevo.

La limpieza cancela la inicialización pendiente, desconecta ResizeObserver, libera las referencias y llama a `game.destroy(true)` (destrucción diferida de Phaser). Cada montaje tiene un padre DOM propio que se retira inmediatamente para evitar canvases viejos visibles durante remontajes. El root actual no usa StrictMode; la limpieza también contempla su secuencia setup-cleanup-setup. La escala FIT conserva proporciones y el listado HTML mantiene nombres, ubicaciones y selección accesibles.

Pruebas de posiciones: `npm.cmd --prefix frontend run test:map` (Node con soporte de TypeScript stripping, verificado en 24.11.0). El lockfile solo añade Phaser y su dependencia eventemitter3. Referencia de APIs: [Game.destroy](https://docs.phaser.io/api-documentation/class/game#destroy) y [Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager); también se revisaron los tipos y el código de la versión instalada. Vite puede advertir del tamaño del chunk de Phaser, que se carga separado de React.

### Comprobación manual del mapa

Iniciar ambos procesos con los comandos anteriores y abrir `http://127.0.0.1:5173`. Si estaban activos antes de añadir `locationId`, reiniciar el backend (esto reinicia su estado en memoria).

1. Al cargar: ver Casa, Cafetería, Trabajo y ambos agentes en Cafetería; comprobar un único canvas con `document.querySelectorAll('.world-canvas canvas').length`.
2. Cambiar Ana/Sofía: comprobar borde y etiqueta «Seleccionado», tanto en el canvas como en HTML. Los dos marcadores deben permanecer separados.
3. Registrar salida, avanzar y consultar. Contrastar el mapa/listado con `locationId` en la respuesta de `/api/state` o `/api/advance` del panel Network.
4. Avanzar de nuevo: el mapa cambia si el backend cambia ubicación; el resumen conserva intervalo, política y texto. Alternar breve/completo y confirmar el corte mostrado.
5. Revisar en escritorio y a 375 px de ancho: sin scroll horizontal, etiquetas y controles accesibles. Revisar la consola por errores nuevos.
6. En una comprobación de desarrollo, envolver temporalmente el root en React StrictMode y remontar `WorldMap`: al estabilizarse debe haber un solo canvas. Probar desmontar antes de acabar la carga inicial y montar otra vez; verificar ausencia de canvases y listeners residuales.

La inspección visual no pudo ejecutarse en el entorno de automatización: no se detectó ningún navegador conectado. Estos pasos, la consola y el ciclo real de remontaje siguen pendientes de verificación visual; los builds y las pruebas automatizadas no los sustituyen.
