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
| GET `/api/state` | — | `{moment, agents:[{id,name,location,lastConnection}]}`; registro ausente: `null` |
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
npm.cmd run demo:activity -- --scenario diurno
npm.cmd run demo:activity -- --scenario nocturno
npm.cmd run demo:activity -- --scenario varios-dias --selection balanced
npm.cmd run demo:activity-session
npm.cmd run demo:activity-two-agents
```

Los comandos originales de desarrollo, build, pruebas y demos se conservan. `test:http` levanta un servidor real en un puerto loopback efímero y lo cierra al terminar.

## Límites

Estado exclusivamente en memoria: recargar el navegador conserva el mundo pero descarta la vista local del resumen; reiniciar el servidor reinicia reloj, mundo, eventos y registros. Avance únicamente manual, sin timers, polling, sincronización continua, WebSockets ni dependencia de la presencia del navegador. No hay autenticación: es un prototipo para la máquina local. La confirmación es explícita, sin sesiones, tokens ni almacenamiento de consultas. La interfaz se actualiza al cargar y tras cada acción, no al actuar desde otra pestaña. Phaser y Colyseus quedan para otros incrementos.
