# Semáforo 5G – Laboratorio Smart Cities

Proyecto educativo que simula un cruce con prioridad a vehículos de emergencia
sobre redes celulares 5G/4G/3G. Incluye un servidor Node.js con WebSockets y
una interfaz web dividida en tres vistas para entender la diferencia de
latencias y el envío de alertas en tiempo real.

## Objetivo

* Mostrar cómo la baja latencia de 5G mejora la reacción de infraestructura
  urbana (semáforos) frente a alertas críticas.
* Comparar, de forma visual y con métricas, el comportamiento de 5G vs 4G vs 3G
  ante un mismo flujo de datos (paquetes de 500 MB y 1 GB).
* Servir como material de laboratorio para cursos de redes/IoT/smart cities.

## Arquitectura

* **Backend**: `Node.js` + `Express` para la API REST y `ws` para WebSockets.
  - Maneja las rutas `/alert`, `/latency`, `/stats` y `/reset`.
  - Guarda las mediciones en memoria y las transmite a todos los clientes
    conectados vía WebSocket (`broadcast`).
  - No hay retardo artificial: la latencia medida corresponde al tiempo real
    entre el envío del alerta desde el cliente y la recepción en el semáforo.
* **Frontend**: páginas estáticas en `public/` servidas por Express.
  - **index.html**: landing con acceso a los tres roles de la demo.
  - **ambulancia.html**: permite elegir red y tamaño de paquete y envía la
    alerta al endpoint `/alert`.
  - **semaforo.html**: se conecta por WebSocket, recibe la alerta, cambia el
    color de la luz y reporta la latencia real con un POST a `/latency`.
  - **resultados.html**: muestra estadísticas en vivo (mínimo/promedio/máximo y
    cantidad de muestras) por red y permite reiniciar los datos vía `/reset`.

## Flujo de la demo

1. Abrí `ambulancia.html`, seleccioná red (5G/4G/3G) y tamaño de paquete, y
   presioná **Enviar Alerta**. El cliente registra la marca de tiempo local y
   envía la petición HTTP al servidor desplegado (por ejemplo, en Render). El
   servidor publica el evento por WebSocket inmediatamente.
2. En `semaforo.html`, el WebSocket recibe la alerta, calcula la latencia real
   con base en las marcas de tiempo (Cliente→Semáforo y Server→Semáforo),
   cambia a verde por 1 segundo y envía la métrica al servidor.
3. `resultados.html` escucha las actualizaciones en vivo y muestra min/prom/máx
   junto con el número de muestras por tecnología. El botón **Borrar datos**
   reinicia el estado en memoria.

## Tecnologías utilizadas

* Node.js 18+
* Express (API REST + estáticos)
* ws (WebSockets nativos en Node)
* CORS para permitir peticiones entre las páginas del mismo host
* HTML, CSS y JavaScript vanilla en el cliente

## Requisitos previos

* Node.js 18 o superior.

## Instalación y ejecución

```bash
npm install
npm run dev
```

El servidor levanta en `http://localhost:3000` y sirve las vistas desde la
carpeta `public/`. Podés abrir cada HTML en pestañas separadas para simular los
módulos de Ambulancia, Semáforo y Resultados.

## Endpoints principales

* `POST /alert` — recibe `networkType` (5G/4G/3G), `packetSize` (500MB/1GB) y
  `clientSentAt` (marca de tiempo del emisor); publica el evento en WebSocket
  con la marca de tiempo del servidor.
* `POST /latency` — almacena la latencia medida por el semáforo y emite un
  evento `STATS_UPDATE` con los acumulados.
* `GET /stats` — devuelve estadísticas actuales (min/prom/máx y cantidad de
  muestras por red).
* `POST /reset` — limpia los datos en memoria y notifica a los clientes.

## Notas para el laboratorio

* El almacenamiento es en memoria: reiniciar el servidor borra todas las
  mediciones.
* Para medición real, asegurate de que el servidor esté accesible desde los
  distintos dispositivos/redes. El servidor registra cuándo recibió la alerta
  (`serverSentAt`) y reenvía la marca de tiempo enviada por la ambulancia
  (`clientSentAt`). El semáforo calcula:
  - **Cliente→Semáforo:** `Date.now() - clientSentAt` (incluye tramo
    Ambulancia→Servidor→Semáforo; requiere relojes razonablemente sincronizados
    entre los equipos).
  - **Server→Semáforo:** `Date.now() - serverSentAt` (tramo desde el servidor
    hasta el semáforo; independiente del reloj del cliente).
* El demo funciona sin dependencias externas adicionales ni base de datos; es
  ideal para entornos sin conectividad o para pruebas rápidas en aula.
### ¿Mide latencia real?

Sí. Ya no hay `setTimeout` ni retrasos simulados. La latencia que muestra el
semáforo proviene de las marcas de tiempo:

* **Cliente→Semáforo** (recomendada cuando hay sincronización NTP razonable en
  los dispositivos): permite medir el recorrido completo desde el celular que
  envía la alerta hasta el dispositivo que recibe el WebSocket.
* **Server→Semáforo** (alternativa si los relojes de los celulares difieren):
  mide sólo el tramo servidor→semaforo, útil si el reloj del emisor no está
  alineado.

Para un laboratorio con redes móviles distintas, desplegá el servidor en un
host común (p. ej. Render), abrí `ambulancia.html` en cada teléfono/red y
`semaforo.html` en el dispositivo que actuará como controlador. Las métricas se
enviarán automáticamente a `/latency` y aparecerán en `resultados.html`.

## Estructura del proyecto

```
semaforo-5g/
├─ public/              # Vistas estáticas (landing, ambulancia, semáforo, resultados)
├─ server.js            # Servidor Express + WebSocket y lógica de medición
├─ package.json         # Scripts y dependencias
└─ README.md            # Este documento
```

## Próximos pasos sugeridos

* Añadir persistencia (por ejemplo SQLite o Redis) para conservar las métricas
  entre sesiones.
* Incluir gráficos históricos en `resultados.html` para visualizar la
  evolución de la latencia.
* Parametrizar los perfiles de latencia y tamaño de paquete desde el cliente
  para experimentar con más escenarios.
