# IVANIA · dirección visual 01

**Fase 1: propuesta para aprobación.** Las imágenes son maquetas visuales, no capturas del juego en ejecución. No se ha sustituido la interfaz, cambiado dependencias ni modificado la simulación. Las interacciones descritas aquí están previstas para la fase 2.

Abrir `index.html` directamente en un navegador para revisar ambas propuestas, o abrir `desktop.png` y `mobile.png` a tamaño completo. La galería no necesita servidor, instalación ni conexión. Los botones dibujados dentro de las imágenes no funcionan.

## Lo revisado

- Interfaz y controles: `frontend/src/main.tsx`, estilos y DTOs de `frontend/src/api.ts`.
- Escena y puente actuales: `WorldMap`, `createWorldGame` y `worldLayout`. React ya entrega estado y selección a una instancia Phaser; el montaje debe seguir tolerando StrictMode y destruir correctamente sus recursos.
- Ubicaciones reales: `home` → Casa, `cafe` → Cafetería, `work` → Trabajo. Agentes: `agent-ana` y `agent-sofia`.
- El estado visible informa momento, nombre, ubicación y última conexión. No informa coordenadas físicas, orientación, trayectorias ni actividad que esté realizando el personaje.
- El resumen devuelve un intervalo capturado, items, conteos y textos del presenter. Se conserva esta fuente de redacción; el diseño no genera nuevas descripciones de actividad.
- No se encontró un conjunto de sprites que reutilizar ni instrucciones `AGENTS.md` en la búsqueda del repositorio. La herramienta de imágenes está disponible y se utilizó para las maquetas. No se incorporaron paquetes de assets.
- **No se pudo inspeccionar la aplicación en un navegador conectado:** la herramienta no expuso navegadores disponibles. Se revisó su código y se inspeccionaron las imágenes generadas. Esto no equivale a comprobar la interfaz productiva visualmente.

## Dirección artística: localidad entre árboles

Vista lateral ortogonal, con un suelo continuo y una localidad pequeña y habitable. Pixel art cálido y contenido: vegetación verde salvia, sombras azul tinta, madera, ladrillo y luz ámbar. Terraria sirve como referencia de perspectiva, escala y densidad ambiental; no se utilizan sus sprites, personajes, interfaz, logotipo ni capturas.

El escenario ocupa aproximadamente el 85 % de la pantalla con los paneles recogidos. La jerarquía es mundo → personajes → reloj y selección → herramientas y resumen. El terreno muestra césped, tierra, raíces y piedras; no implica excavación o construcción.

Las tres fachadas tienen identidad propia, incluso ocultando sus rótulos:

| Ubicación | Arquitectura y detalle distintivo |
| --- | --- |
| Casa | Revoco crema, tejado de teja asimétrico, chimenea, porche de madera y jardín con cerca baja. |
| Cafetería | Toldo turquesa, escaparate ancho con luz cálida, pequeño letrero de taza, macetas y banco. |
| Trabajo | Ladrillo rojizo, ventanas altas agrupadas y cubierta azul oscura en dientes de sierra. Sin maquinaria animada ni acciones laborales inventadas. |

Árboles, helechos, flores, faroles y cercas unen las zonas sin ocultar a los personajes. Tres planos de fondo —montañas, lomas arboladas y árboles próximos— darán profundidad mediante parallax ligado al desplazamiento de cámara. No habrá avance automático del mundo. Las siluetas lejanas de la maqueta son decoración; los únicos destinos interactivos serán las tres ubicaciones reales.

El cielo se construirá con bandas de color y nubes pixeladas, sin degradados suaves. Separar cielo, fondo y máscaras de luz permitirá variar día/noche más adelante. La maqueta muestra una dirección de tarde cálida; no define todavía un sistema horario de iluminación.

## Escala y nitidez

Las imágenes aprueban composición, color y siluetas. **No son spritesheets ni entregables ajustados píxel a píxel a la cuadrícula final.** El arte de producción debe dibujarse y limpiarse a resolución nativa, no obtenerse reduciendo la captura completa.

| Elemento | Medida lógica propuesta |
| --- | --- |
| Tile base | 16 × 16 px |
| Personaje | Lienzo de 16 × 32 px; pivote en los pies |
| Puerta / ventana | 24 × 40 px / 16 × 24 px |
| Casa / Cafetería / Trabajo | Aproximadamente 128 × 112 / 144 × 112 / 144 × 128 px |
| Banco / farol | 32 × 16 / 16 × 48 px |
| Árboles | 64–80 px de ancho y 112–144 px de alto |
| Vista de referencia de escritorio | 640 × 360 px lógicos, con terreno y margen de cámara a ambos lados |
| Escalado del mundo | Pasos enteros de 2×, 3× y 4×; 3× como referencia de escritorio, 2× en pantalla estrecha |

Las puertas admiten la altura de ambos personajes y los edificios miden entre tres y cuatro alturas de personaje. Las variantes decorativas respetan la misma cuadrícula y densidad de detalle.

El viewport lógico se adapta al espacio y al factor entero: una pantalla estrecha muestra menos mundo horizontal, **no toda la localidad encogida**. Cámara y sprites se alinean a píxeles; texturas con muestreo nearest, sin suavizado ni zoom fraccionario persistente. El texto HTML mantiene resolución y tamaño de lectura independientes del pixel art.

Paleta base, ampliable con sombras y luces hasta un máximo aproximado de 24–32 colores de mundo:

| Uso | Color |
| --- | --- |
| Tinta y contornos | `#152431` |
| Pino y sombras vegetales | `#264d48` |
| Salvia | `#67916b` |
| Turquesa de acento | `#69c6b6` |
| Teja y ladrillo | `#b8664e` |
| Luz ámbar | `#e6b776` |
| Crema | `#f0e4c5` |
| Lavanda de acento | `#9b8ac5` |

## Ana y Sofía

- **Ana:** cabello castaño corto, chaqueta turquesa, camiseta crema y pantalón oscuro. Silueta compacta y cabello redondeado.
- **Sofía:** coleta oscura, chaqueta ciruela y pañuelo ocre. Coleta y cuello diferenciados incluso sin color.
- Reposo previsto: cuatro fotogramas por agente, con parpadeo y respiración mínima de un píxel. Es animación visual decorativa; no significa una acción registrada por el motor.
- Selección mediante pequeño chevrón y contorno claro, además del color. Nombre solo al seleccionar, señalar con puntero o enfocar el control equivalente en HTML.
- Dos anclajes estables por ubicación, asignados por ID y separados al menos 32 px lógicos. Si una agente cambia de lugar, no se recentra a la otra. Nombres elevados y separados si coinciden sus estados de foco.
- Los anclajes ante la fachada indican pertenencia a la ubicación; no afirman que la persona esté físicamente fuera del edificio.
- Una ubicación desconocida conserva el fallback explícito «Ubicación no representada», con su dato accesible en HTML. Nunca se dibuja silenciosamente en Casa.

No se dibujan paseos, herramientas en uso o bocadillos de conversación como actividad actual. Los cambios de ubicación siguen siendo instantáneos cuando llega el estado HTTP.

## Composición de interfaz

**Escritorio:** HUD superior compacto con IVANIA, día/hora, selector Ana/Sofía y «Centrar». Al seleccionar, una ficha pequeña en una esquina muestra nombre, ubicación, última conexión y «Registrar salida». El resumen se recoge en una pestaña inferior; al abrirlo ocupa un lateral de unos 360–400 px, sin cubrir toda la localidad. Las herramientas de simulación permanecen plegadas cuando no se usan.

**Pantalla estrecha:** HUD en dos líneas; cámara centrada en la ubicación de la agente, con parte de las fachadas vecinas entrando en el encuadre. El resumen se abre como hoja inferior de hasta un 45 % de la altura, con su contenido desplazable. Al cerrarlo se recupera el espacio del mundo. No se dejan varias fichas superpuestas: la ficha contextual y el resumen comparten la zona de panel. Objetivos táctiles de al menos 44 px; texto normal de 14–16 px.

La maqueta de escritorio muestra el resumen recogido; la estrecha lo muestra abierto. Para ilustrarlo se usa el caso de demostración de Ana del día 1, 10:00–18:00: 26 eventos, 22 items completos y 8 seleccionados con `balanced`. Son datos de referencia para la composición, **no una lectura en vivo del servidor**. La imagen estrecha muestra solo las primeras filas de un panel desplazable; no sustituye el texto completo del presenter.

Funciones y textos a conservar:

- «Registrar salida» pertenece a la ficha de agente. «Consultar regreso» obtiene un nuevo resultado. «Confirmar hasta [corte]» es una acción distinta y se deshabilita después de confirmar correctamente.
- El resumen muestra agente, `result.from`, `result.to`, política aplicada y conteos. Breve/completo alterna los textos y conjuntos del mismo resultado.
- La política elegida lleva la indicación «Próxima consulta»; «Resultado: …» identifica la política que produjo el contenido visible.
- La hora del HUD es la actual; el intervalo del resumen es histórico. Si el mundo llega a las 20:00, el resumen de las 18:00 sigue intacto.
- «Herramientas de simulación» contiene solamente los avances existentes de 5 minutos, 1 hora y 8 horas.
- Carga, error, «Sin salida registrada», intervalo sin actividad y momento confirmado tienen estados HTML explícitos.
- Nombre y ubicación de ambas agentes permanecen disponibles como texto HTML y selección por teclado. El canvas no es la única fuente de información.

No hay monedas, salud, misiones, inventario ni indicadores de conexión inventados.

## Interacciones previstas — todavía no implementadas

| Acción | Comportamiento propuesto |
| --- | --- |
| Clic en personaje | Selecciona su ID también en React y abre su ficha. Cambiar de agente limpia el resumen anterior sin confirmarlo. |
| Clic en edificio | Abre nombre y lista de agentes cuyo `locationId` coincide, según el estado visible actual. Un edificio vacío dice que no hay agentes allí. No mueve a nadie ni registra una conexión. |
| Arrastre de cámara | Desplaza únicamente la vista, con límites al tamaño del escenario. Superar 6 px CSS con ratón u 8 px con tacto convierte el gesto en arrastre y cancela el clic de selección al soltar. |
| Zoom | Botones −/+ y rueda sobre el canvas; pasos 2×/3×/4× con límites. El zoom mantiene el punto observado y no modifica coordenadas del mundo simulado. |
| Centrar | Lleva la cámara al anclaje del agente seleccionado. No ejecuta ticks ni cambia su ubicación. |
| Abrir/cerrar resumen | Conserva el resultado capturado; abrir por sí solo no consulta. Botón de cierre o Escape devuelve el foco al control que lo abrió. |
| Registrar nueva salida | Usa la operación actual del servidor y limpia el resultado anterior de ese agente. |
| Confirmar regreso | Envía exactamente `result.agentId` y `result.to`; nunca sustituye el corte por el reloj del HUD. |

Los controles HTML capturan sus propios eventos y no inician arrastres, zoom o selección del canvas que está debajo. El mapa solo captura el puntero cuando el gesto empieza sobre él. Durante una operación HTTP se deshabilitan los controles incompatibles; las respuestas tardías conservan la protección existente por agente. Seleccionar otra agente o edificio nunca confirma un resultado.

## Assets y separación técnica

| Grupo | Entrega prevista | Obtención |
| --- | --- | --- |
| Terreno | Atlas pequeño: hierba, bordes, tierra, raíces y roca; unas 12–16 variantes | Dibujo original a 16 px, con variantes limitadas y revisión de uniones. |
| Edificios | Tres fachadas, con cubiertas, ventanas, rótulos y máscaras de luz separados | Diseño original desde esta dirección; limpieza de silueta y píxeles a tamaño nativo. |
| Personajes | Dos spritesheets de cuatro fotogramas de reposo; pivotes iguales | Sprites originales con paletas y siluetas anteriores. Revisar el bucle ampliado y a escala de juego. |
| Vegetación y decoración | 2–3 árboles, arbustos, flores, cerca modular, banco y farol | Atlas original compartido; variación mediante piezas, no mediante resoluciones incompatibles. |
| Fondos | Cielo, montañas, arbolado lejano y árboles próximos separados | Capas originales que permitan parallax y futura recoloración. |
| Iconos | Centrar, zoom, desplegar, cerrar y selección | Pocos iconos propios en cuadrícula de 16 px, con etiquetas accesibles HTML. |

Herramientas disponibles: generación de imágenes para estudios visuales y referencias aisladas; código del proyecto para ensamblar y revisar el atlas en Phaser. La generación no garantiza por sí sola fotogramas consistentes o pixel art limpio: el presupuesto contempla creación y limpieza explícita de los sprites y comprobación en la escena. La primera comprobación de producción será una fachada y ambos personajes a escala nativa antes de completar todo el conjunto.

No se han descargado assets externos ni comprado recursos. Las imágenes se generaron para esta propuesta, con prompts conservados en `prompts.md`; no tienen una atribución de paquete externo. Los futuros archivos de producción registrarán autoría/origen y condiciones de uso. Si hiciera falta un recurso externo, se documentarán URL, licencia y atribución antes de incorporarlo; los paquetes grandes o de pago requieren autorización.

**Phaser:** capas de escenario, tiles, fachadas, sprites, resaltado, detección de clic, cámara y animaciones de reposo. Coordenadas solo de presentación. Assets PNG separados y atlas con marcos definidos; nunca una captura de pantalla completa como fondo que simule controles.

**React + HTML/CSS:** HUD, nombres y ubicaciones accesibles, selector, fichas, resumen, políticas, botones, estados HTTP y herramientas de simulación. El presenter del servidor sigue redactando actividades e intervalos.

**Node.js:** conserva la única autoridad del reloj, ubicación, eventos, registro y resumen. Phaser no consulta la API, ejecuta ticks ni deduce actividades. Se conserva el puente local React → Phaser, con una instancia por montaje y limpieza al desmontar.

## Límites y siguiente paso

«Explorar» significa mover la cámara y consultar personajes y edificios; no controlar un avatar. No hay interiores, rutas, colisiones, saltos ni física. El escenario no añade ubicaciones o decisiones. No se incorporan polling, WebSockets, persistencia ni sincronización entre pestañas.

La fidelidad final requiere assets a escala nativa y una inspección real en navegador. Estas imágenes no prueban accesibilidad, gestos, rendimiento, nitidez de texturas ni el comportamiento de los paneles. En esta fase no corresponden builds o regresiones: solo se añadieron archivos de propuesta, sin tocar código ejecutable del producto.

Tras aprobar composición, paleta y personajes, la fase 2 podrá implementar los assets separados y las interacciones y verificar escritorio/móvil, el ciclo de resumen, cámara, limpieza de Phaser, builds y pruebas existentes. Hasta entonces, la interfaz productiva permanece como estaba.
