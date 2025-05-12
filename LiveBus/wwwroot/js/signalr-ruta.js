// Objeto global para manejar la funcionalidad de ruta con SignalR
window.rutaSignalR = {
    connection: null,
    markers: {},
    routes: {},
    isStarted: false,
    map: null,
    rutaId: null,
    rutaHabilitada: false,
    debugMode: true, // Activar para ver más logs

    // Configurar el ID de la ruta a mostrar
    setRutaId: function (id) {
        this.rutaId = id;
        this.log(`ID de ruta establecido: ${id}`);
    },

    // Función de registro condicional
    log: function (message, data) {
        if (this.debugMode) {
            if (data) {
                console.log(`[rutaSignalR] ${message}`, data);
            } else {
                console.log(`[rutaSignalR] ${message}`);
            }
        }
    },

    // Inicializar el mapa
    initializeMap: function () {
        this.log("Inicializando mapa...");

        if (this.map) {
            this.log("El mapa ya está inicializado");
            return;
        }

        // Verificar que Leaflet esté cargado
        if (typeof L === 'undefined') {
            console.error("Error: Leaflet no está cargado. Comprueba que la biblioteca se ha cargado correctamente.");
            return;
        }

        try {
            this.log("Creando instancia del mapa");
            this.map = L.map('map').setView([42.2345, -8.7072], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(this.map);

            this.map.zoomControl.setPosition('bottomright');

            // Dar más tiempo para que el mapa se inicialice correctamente
            setTimeout(() => {
                if (this.map) {
                    this.log("Ajustando tamaño del mapa");
                    this.map.invalidateSize();
                }
            }, 300);

            this.log("Mapa inicializado correctamente");
        } catch (err) {
            console.error("Error al inicializar el mapa:", err);
        }
    },

    // Inicializar la conexión SignalR
    init: async function () {
        try {
            this.log(`Inicializando visualización de la ruta ${this.rutaId}...`);

            // Asegurarnos que el mapa está inicializado primero
            if (!this.map) {
                this.log("El mapa no está inicializado, inicializando ahora...");
                this.initializeMap();

                // Dar tiempo al mapa para inicializarse completamente
                this.log("Esperando a que el mapa se inicialice completamente...");
                await new Promise(resolve => setTimeout(resolve, 500));

                // Verificar si el mapa se inicializó correctamente
                if (!this.map) {
                    console.error("El mapa no se pudo inicializar después de esperar");
                    return;
                }
            }

            this.log("Verificando si la ruta existe y está habilitada...");
            const rutaExisteYHabilitada = await this.verificarRutaExisteYHabilitada();
            if (!rutaExisteYHabilitada) {
                console.error(`La ruta ${this.rutaId} no existe o está deshabilitada`);
                this.mostrarMensajeError("La ruta no está disponible o ha sido deshabilitada");
                return;
            }

            this.log("Configurando conexión SignalR...");
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl("/autobusMoveHub")
                .withAutomaticReconnect()
                .build();

            this.setupSignalRHandlers();

            this.log("Iniciando conexión SignalR...");
            await this.connection.start();
            this.log("Conexión SignalR establecida");

            this.log("Cargando datos iniciales...");
            await this.cargarDatosIniciales();
            this.log("Datos iniciales cargados correctamente");
        } catch (err) {
            console.error("Error al inicializar SignalR: ", err);
            this.mostrarMensajeError(`Error al cargar los datos de la ruta: ${err.message}`);
        }
    },

    verificarRutaExisteYHabilitada: async function () {
        try {
            this.log(`Verificando si la ruta ${this.rutaId} existe y está habilitada...`);
            const response = await fetch(`/api/Rutas/${this.rutaId}`);
            this.log(`Respuesta recibida con estado: ${response.status}`);

            if (!response.ok) {
                console.error(`La ruta ${this.rutaId} no está disponible. Estado: ${response.status}`);
                this.rutaHabilitada = false;
                return false;
            }

            const ruta = await response.json();
            this.log(`Datos de la ruta ${this.rutaId} recibidos:`, ruta);

            if (ruta.habilitada === false) {
                console.error(`La ruta ${this.rutaId} está deshabilitada`);
                this.rutaHabilitada = false;
                return false;
            }

            this.rutaHabilitada = true;
            return true;
        } catch (err) {
            console.error(`Error al verificar la ruta ${this.rutaId}:`, err);
            this.rutaHabilitada = false;
            return false;
        }
    },

    mostrarMensajeError: function (mensaje) {
        if (!this.map) {
            console.error("No se puede mostrar el mensaje de error porque el mapa no está inicializado");
            return;
        }

        const errorControl = L.control({ position: 'topright' });
        errorControl.onAdd = function () {
            const div = L.DomUtil.create('div', 'info-error');
            div.innerHTML = `<div class="alert alert-danger" role="alert">${mensaje}</div>`;
            return div;
        };
        errorControl.addTo(this.map);
    },

    setupSignalRHandlers: function () {
        // Eventos genéricos (filtrar por rutaId)
        this.connection.on("RecibirActualizacionPosicion", (autobusId, latitud, longitud) => {
            this.verificarYActualizarAutobus(autobusId, latitud, longitud);
        });

        // Eventos para rutas específicas
        this.connection.on("SimulacionIniciadaRuta", (rutaId) => {
            if (rutaId == this.rutaId) {
                this.isStarted = true;
                this.log(`Simulación iniciada para ruta ${rutaId}`);
            }
        });

        this.connection.on("SimulacionPausadaRuta", (rutaId) => {
            if (rutaId == this.rutaId) {
                this.isStarted = false;
                this.log(`Simulación pausada para ruta ${rutaId}`);
            }
        });

        this.connection.on("SimulacionReiniciadaRuta", (rutaId) => {
            if (rutaId == this.rutaId) {
                this.isStarted = true;
                this.log(`Simulación reiniciada para ruta ${rutaId}`);
            }
        });

        this.connection.on("ActualizarEstadoRuta", async (rutaId, habilitada) => {
            if (rutaId == this.rutaId) {
                this.log(`Estado de ruta ${rutaId} actualizado: ${habilitada}`);
                if (!habilitada) {
                    this.rutaHabilitada = false;
                    this.limpiarMapa();
                    this.mostrarMensajeError("Esta ruta ha sido deshabilitada");
                } else if (!this.rutaHabilitada && habilitada) {
                    this.rutaHabilitada = true;
                    await this.cargarDatosIniciales();
                }
            }
        });

        // Mantener los eventos globales, pero solo para compatibilidad
        this.connection.on("SimulacionIniciada", () => {
            // No cambiar estado aquí, solo para registro
            this.log("Evento global: Simulación iniciada");
        });

        this.connection.on("SimulacionPausada", () => {
            // No cambiar estado aquí, solo para registro
            this.log("Evento global: Simulación pausada");
        });

        this.connection.on("SimulacionReiniciada", () => {
            // No cambiar estado aquí, solo para registro
            this.log("Evento global: Simulación reiniciada");
        });
    },

    limpiarMapa: function () {
        this.log("Limpiando mapa...");

        for (const autobusId in this.markers) {
            this.eliminarMarcadorAutobus(autobusId);
        }

        for (const rutaId in this.routes) {
            if (this.routes[rutaId] && this.routes[rutaId].polyline) {
                this.map.removeLayer(this.routes[rutaId].polyline);
            }
        }
        this.routes = {};
        this.log("Mapa limpiado correctamente");
    },

    cargarDatosIniciales: async function () {
        let intentos = 0;
        const maxIntentos = 3;

        while (intentos < maxIntentos) {
            try {
                this.log(`Intento ${intentos + 1} de ${maxIntentos} para cargar datos iniciales...`);

                // Cargar la ruta específica
                await this.cargarRuta();

                // Cargar los autobuses de la ruta
                await this.cargarAutobuses();

                this.log("Datos iniciales cargados correctamente");
                return; // Salir si todo fue exitoso
            } catch (err) {
                intentos++;
                console.error(`Error al cargar datos iniciales (intento ${intentos}): `, err);

                if (intentos >= maxIntentos) {
                    this.mostrarMensajeError(`Error al cargar datos: ${err.message}`);
                    throw err; // Re-lanzar para que el llamante maneje el error
                }

                // Esperar antes de reintentar
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    },

    cargarRuta: async function () {
        try {
            this.log(`Cargando datos de la ruta ${this.rutaId}...`);

            // Agregar un timeout para evitar esperas infinitas
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos máximo

            const response = await fetch(`/api/Rutas/${this.rutaId}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`Error al cargar la ruta ${this.rutaId}. Estado: ${response.status}`);
                this.mostrarMensajeError("Error al cargar los datos de la ruta");
                return;
            }

            const ruta = await response.json();
            this.log(`Ruta ${this.rutaId} cargada:`, ruta);

            if (!ruta || typeof ruta !== 'object') {
                console.error(`Datos de ruta inválidos para la ruta ${this.rutaId}`);
                this.mostrarMensajeError("Datos de ruta inválidos recibidos del servidor");
                return;
            }

            if (!ruta.puntosRuta) {
                console.error(`La ruta ${this.rutaId} no tiene puntos definidos`);
                this.mostrarMensajeError("La ruta no tiene puntos definidos");
                return;
            }

            // Normalizar el formato de los puntos (manejar el formato $values de ASP.NET)
            if (ruta.puntosRuta.$values) {
                ruta.puntosRuta = ruta.puntosRuta.$values;
            }

            this.log(`Puntos de la ruta ${this.rutaId}:`, ruta.puntosRuta);

            if (!Array.isArray(ruta.puntosRuta) || ruta.puntosRuta.length < 2) {
                console.error(`La ruta ${this.rutaId} no tiene suficientes puntos (${ruta.puntosRuta?.length || 0})`);
                this.mostrarMensajeError("La ruta no tiene suficientes puntos para ser mostrada");
                return;
            }

            this.dibujarRuta(ruta);
        } catch (err) {
            console.error(`Error al cargar la ruta ${this.rutaId}:`, err);
            this.mostrarMensajeError(`Error al cargar la ruta: ${err.message}`);
        }
    },

    cargarAutobuses: async function () {
        this.log("Cargando autobuses...");
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch('/api/Autobuses', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`Error al cargar autobuses. Estado: ${response.status}`);
                return;
            }

            const data = await response.json();
            const autobuses = data.$values || data;

            if (Array.isArray(autobuses)) {
                this.log(`Se encontraron ${autobuses.length} autobuses en total`);
                let autobusesRuta = 0;

                for (const autobus of autobuses) {
                    // Solo procesar autobuses de esta ruta
                    if (autobus.rutaId == this.rutaId) {
                        autobusesRuta++;
                        if (autobus.ruta && autobus.ruta.puntosRuta && autobus.ruta.puntosRuta.$values) {
                            autobus.ruta.puntosRuta = autobus.ruta.puntosRuta.$values;
                        }

                        // Encontrar la posición actual del autobús
                        let latitud = null, longitud = null;

                        if (autobus.ruta && autobus.ruta.puntosRuta && autobus.ruta.puntosRuta.length > 0) {
                            const puntoActual = autobus.ruta.puntosRuta.find(p => p.orden === autobus.puntoActual) ||
                                autobus.ruta.puntosRuta[0];

                            latitud = puntoActual.latitud;
                            longitud = puntoActual.longitud;
                        }

                        if (latitud !== null && longitud !== null) {
                            this.crearMarcadorAutobus(autobus.id, latitud, longitud, autobus.nombre);
                        }
                    }
                }
                this.log(`Se cargaron ${autobusesRuta} autobuses para la ruta ${this.rutaId}`);
            } else {
                console.error("El formato de autobuses recibido no es un array");
            }
        } catch (err) {
            console.error("Error al cargar autobuses:", err);
        }
    },

    verificarYActualizarAutobus: async function (autobusId, latitud, longitud) {
        try {
            const response = await fetch(`/api/Autobuses/${autobusId}`);
            if (response.ok) {
                const autobus = await response.json();

                // Solo actualizar si el autobús pertenece a esta ruta
                if (autobus.rutaId == this.rutaId) {
                    this.actualizarPosicionAutobus(autobusId, latitud, longitud);
                }
            }
        } catch (err) {
            console.error(`Error al verificar autobús ${autobusId}:`, err);
        }
    },

    obtenerYMostrarAutobus: async function (autobusId) {
        try {
            const response = await fetch(`/api/Autobuses/${autobusId}`);
            if (response.ok) {
                const autobus = await response.json();

                // Solo mostrar si el autobús pertenece a esta ruta
                if (autobus.rutaId == this.rutaId) {
                    let latitud = null, longitud = null;

                    // Intentar obtener la posición actual
                    if (autobus.posiciones && autobus.posiciones.length > 0) {
                        const ultimaPosicion = autobus.posiciones[autobus.posiciones.length - 1];
                        latitud = ultimaPosicion.latitud;
                        longitud = ultimaPosicion.longitud;
                    } else if (autobus.ruta && autobus.ruta.puntosRuta && autobus.ruta.puntosRuta.length > 0) {
                        const puntoActual = autobus.ruta.puntosRuta.find(p => p.orden === autobus.puntoActual) ||
                            autobus.ruta.puntosRuta[0];

                        latitud = puntoActual.latitud;
                        longitud = puntoActual.longitud;
                    }

                    if (latitud !== null && longitud !== null) {
                        this.crearMarcadorAutobus(autobus.id, latitud, longitud, autobus.nombre);
                    }
                }
            }
        } catch (err) {
            console.error(`Error al obtener autobús ${autobusId}:`, err);
        }
    },

    actualizarPosicionAutobus: function (autobusId, latitud, longitud) {
        if (this.markers[autobusId]) {
            const newLatLng = L.latLng(latitud, longitud);
            this.markers[autobusId].slideTo(newLatLng, {
                duration: 2000,
                keepAtCenter: false
            });
        } else {
            this.obtenerYMostrarAutobus(autobusId);
        }
    },

    eliminarMarcadorAutobus: function (autobusId) {
        if (this.markers[autobusId]) {
            this.map.removeLayer(this.markers[autobusId]);
            delete this.markers[autobusId];
        }
    },

    crearMarcadorAutobus: function (autobusId, latitud, longitud, nombre = `Autobús ${autobusId}`) {
        // Verificar si el mapa está inicializado
        if (!this.map) {
            console.error("No se puede crear el marcador porque el mapa no está inicializado");
            return null;
        }

        // Crear un icono personalizado con una imagen PNG de un autobús
        const busIcon = L.icon({
            iconUrl: '/img/autobus.png',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });

        // Crear el marcador y añadirlo al mapa
        const marker = L.marker([latitud, longitud], {
            icon: busIcon,
            title: nombre
        }).addTo(this.map);

        // Añadir popup con información
        marker.bindPopup(`<b>${nombre}</b><br>ID: ${autobusId}`);

        this.markers[autobusId] = marker;

        if (!marker.slideTo && L.Marker.MovingMarker) {
            Object.assign(marker, L.Marker.MovingMarker.prototype);
        }

        return marker;
    },

    dibujarRuta: function (ruta) {
        this.log("Iniciando dibujo de ruta...");

        // Verificar que el mapa esté inicializado
        if (!this.map) {
            console.error("Error: No se puede dibujar la ruta porque el mapa no está inicializado");
            this.initializeMap();

            if (!this.map) {
                setTimeout(() => this.dibujarRuta(ruta), 500); // Reintentar después de un tiempo
                return;
            }
        }

        if (!ruta.puntosRuta || ruta.puntosRuta.length < 2) {
            console.error("La ruta no tiene suficientes puntos para ser dibujada");
            return;
        }

        try {
            this.log("Procesando puntos de ruta...");

            // Ordenar los puntos por el orden
            const puntosOrdenados = [...ruta.puntosRuta].sort((a, b) => a.orden - b.orden);

            // Filtrar puntos inválidos (coordenadas no numéricas)
            const puntos = puntosOrdenados
                .filter(p =>
                    p &&
                    typeof p.latitud === 'number' && !isNaN(p.latitud) &&
                    typeof p.longitud === 'number' && !isNaN(p.longitud))
                .map(p => [p.latitud, p.longitud]);

            this.log(`Puntos procesados y filtrados: ${puntos.length} puntos válidos`);

            // Verificar que tenemos suficientes puntos válidos
            if (puntos.length < 2) {
                console.error("No hay suficientes puntos válidos para dibujar la ruta");
                return;
            }

            const rutaColor = ruta.id === 2 ? 'rgb(51, 136, 255)' : this.getRandomColor();

            // Crear la polilínea con los puntos válidos
            const rutaLine = L.polyline(puntos, {
                color: rutaColor,
                weight: 5,
                opacity: 0.7
            }).addTo(this.map);

            rutaLine.bindPopup(`<b>Ruta: ${ruta.descripcion}</b><br>ID: ${ruta.id}`);

            // Ajustar el mapa para mostrar toda la ruta
            this.map.fitBounds(rutaLine.getBounds(), { padding: [50, 50] });

            this.routes[ruta.id] = {
                polyline: rutaLine,
                puntos: puntosOrdenados,
                color: rutaColor
            };

            this.log(`Ruta ${ruta.id} dibujada con éxito. Puntos totales: ${puntos.length}`);
        } catch (err) {
            console.error(`Error al dibujar la ruta ${ruta.id}:`, err);
            this.mostrarMensajeError(`Error al dibujar la ruta: ${err.message}`);
        }
    },

    actualizarInfoAutobus: function (autobus) {
        if (!autobus) return;
        if (autobus.posiciones) {
            const posiciones = autobus.posiciones.$values || autobus.posiciones;

            if (posiciones && posiciones.length > 0) {
                const ultimaPosicion = posiciones[posiciones.length - 1];
                this.actualizarPosicionAutobus(autobus.id, ultimaPosicion.latitud, ultimaPosicion.longitud);
            }
        }

        const marker = this.markers[autobus.id];
        if (marker) {
            marker.bindPopup(`
            <b>${autobus.nombre || 'Autobús ' + autobus.id}</b><br>
            ID: ${autobus.id}<br>
            Estado: ${autobus.estado || 'En servicio'}<br>
            Ruta: ${autobus.ruta ? autobus.ruta.descripcion : 'Sin asignar'}
        `);
        }
    },

    iniciarSimulacion: async function () {
        this.log("Iniciando simulación...");
        if (!this.rutaHabilitada) {
            console.error("No se puede iniciar la simulación: la ruta está deshabilitada");
            return;
        }

        try {
            await fetch(`/api/Simulacion/iniciar?rutaId=${this.rutaId}`, { method: 'POST' });
            this.log("Petición de inicio de simulación enviada");
        } catch (err) {
            console.error("Error al iniciar simulación:", err);
        }
    },

    pausarSimulacion: async function () {
        this.log("Pausando simulación...");
        try {
            await fetch(`/api/Simulacion/pausar?rutaId=${this.rutaId}`, { method: 'POST' });
            this.log("Petición de pausa de simulación enviada");
        } catch (err) {
            console.error("Error al pausar simulación:", err);
        }
    },

    reiniciarSimulacion: async function () {
        this.log("Reiniciando simulación...");
        if (!this.rutaHabilitada) {
            console.error("No se puede reiniciar la simulación: la ruta está deshabilitada");
            return;
        }

        try {
            await fetch(`/api/Simulacion/reiniciar?rutaId=${this.rutaId}`, { method: 'POST' });
            this.log("Petición de reinicio de simulación enviada");
        } catch (err) {
            console.error("Error al reiniciar simulación:", err);
        }
    },

    verificarRutaExisteYHabilitada: async function () {
        try {
            this.log(`Verificando si la ruta ${this.rutaId} existe y está habilitada...`);
            const response = await fetch(`/api/Rutas/${this.rutaId}`);
            this.log(`Respuesta recibida con estado: ${response.status}`);

            if (!response.ok) {
                console.error(`La ruta ${this.rutaId} no está disponible. Estado: ${response.status}`);
                this.rutaHabilitada = false;
                return false;
            }

            const ruta = await response.json();
            this.log(`Datos de la ruta ${this.rutaId} recibidos:`, ruta);

            if (ruta.habilitada === false) {
                console.error(`La ruta ${this.rutaId} está deshabilitada`);
                this.rutaHabilitada = false;
                return false;
            }

            this.rutaHabilitada = true;
            return true;
        } catch (err) {
            console.error(`Error al verificar la ruta ${this.rutaId}:`, err);
            this.rutaHabilitada = false;
            return false;
        }
    },

    // Utilidad para generar colores aleatorios para las rutas
    getRandomColor: function () {
        const colors = [
            '#3388ff', '#ff3333', '#33ff33', '#ffff33',
            '#ff33ff', '#33ffff', '#ff9900', '#9900ff'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
};
