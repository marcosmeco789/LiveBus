// Objeto global para manejar la funcionalidad de autobuses con SignalR
window.autobusSignalR = {
    connection: null,
    markers: {},
    routes: {},
    isStarted: false,
    map: null,
    rutasActivas: {},  // Nueva propiedad para almacenar el estado de habilitación de las rutas

    // Inicializar el mapa
    initializeMap: function () {
        if (this.map) return;

        this.map = L.map('map').setView([42.2345, -8.7072], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);

        this.map.zoomControl.setPosition('bottomright');

        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    },

    // Inicializar la conexión SignalR
    init: async function () {
        try {
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl("/autobusMoveHub")
                .withAutomaticReconnect()
                .build();

            this.setupSignalRHandlers();

            await this.connection.start();
            console.log("Conexión SignalR establecida");


            await this.cargarDatosIniciales();
        } catch (err) {
            console.error("Error al inicializar SignalR: ", err);
        }
    },

    setupSignalRHandlers: function () {
        this.connection.on("RecibirActualizacionPosicion", (autobusId, latitud, longitud) => {
            this.actualizarPosicionAutobus(autobusId, latitud, longitud);
        });

        this.connection.on("RecibirInfoAutobus", (autobus) => {
            this.actualizarInfoAutobus(autobus);
        });

        this.connection.on("RecibirCambioRuta", (autobusId, rutaId) => {
            this.actualizarRutaAutobus(autobusId, rutaId);
        });

        this.connection.on("SimulacionIniciada", () => {
            this.isStarted = true;
            console.log("Simulacion iniciada");
        });

        this.connection.on("SimulacionPausada", () => {
            this.isStarted = false;
            console.log("Simulacion pausada");
        });

        this.connection.on("SimulacionReiniciada", () => {
            this.isStarted = true;
            console.log("Simulacion reiniciada");
            this.actualizarRutasVisibles(); // Actualizar rutas visibles al reiniciar
        });

        // Nuevo manejador para actualizar el estado de visibilidad de las rutas
        this.connection.on("ActualizarEstadoRuta", (rutaId, habilitada) => {
            console.log(`Actualizando estado de la ruta ${rutaId}: ${habilitada}`);
            this.rutasActivas[rutaId] = habilitada;
            this.actualizarEstadoVisibilidadRuta(rutaId, habilitada);
        });
    },

    cargarDatosIniciales: async function () {
        try {
            const rutasResponse = await fetch('/api/Rutas');
            if (rutasResponse.ok) {
                const data = await rutasResponse.json();

                const rutas = data.$values || data;

                if (Array.isArray(rutas)) {
                    // Limpiar rutas anteriores
                    this.limpiarRutas();

                    for (const ruta of rutas) {
                        if (ruta.puntosRuta && ruta.puntosRuta.$values) {
                            ruta.puntosRuta = ruta.puntosRuta.$values;
                        }

                        // Almacenar el estado de habilitación
                        this.rutasActivas[ruta.id] = ruta.habilitada;

                        // Solo dibujar la ruta si está habilitada
                        if (ruta.habilitada) {
                            this.dibujarRuta(ruta);
                        }
                    }
                } else {
                    console.error("El formato de rutas recibido no es un array:", rutas);
                }
            }

            const autobusesResponse = await fetch('/api/Autobuses');
            if (autobusesResponse.ok) {
                const data = await autobusesResponse.json();
                const autobuses = data.$values || data;

                if (Array.isArray(autobuses)) {
                    // Limpiar marcadores anteriores
                    this.limpiarMarcadores();

                    for (const autobus of autobuses) {
                        if (autobus.ruta && autobus.ruta.puntosRuta && autobus.ruta.puntosRuta.$values) {
                            autobus.ruta.puntosRuta = autobus.ruta.puntosRuta.$values;
                        }

                        // Solo mostrar autobús si su ruta está habilitada
                        if (autobus.ruta &&
                            autobus.ruta.habilitada &&
                            autobus.ruta.puntosRuta &&
                            autobus.ruta.puntosRuta.length > 0) {

                            const puntoActual = autobus.ruta.puntosRuta.find(p => p.orden === autobus.puntoActual) ||
                                autobus.ruta.puntosRuta[0];

                            this.crearMarcadorAutobus(autobus.id, puntoActual.latitud, puntoActual.longitud, autobus.nombre);
                        }
                    }
                } else {
                    console.error("El formato de autobuses recibido no es un array:", autobuses);
                }
            }
        } catch (err) {
            console.error("Error al cargar datos iniciales: ", err);
        }
    },

    actualizarPosicionAutobus: function (autobusId, latitud, longitud) {
        // Obtener información del autobús para verificar su ruta
        fetch(`/api/Autobuses/${autobusId}`)
            .then(response => response.json())
            .then(autobus => {
                const rutaId = autobus.rutaId;

                // Solo actualizar si la ruta está habilitada
                if (this.rutasActivas[rutaId]) {
                    if (this.markers[autobusId]) {
                        const newLatLng = L.latLng(latitud, longitud);
                        this.markers[autobusId].slideTo(newLatLng, {
                            duration: 2000,
                            keepAtCenter: false
                        });
                    } else {
                        this.crearMarcadorAutobus(autobusId, latitud, longitud);
                    }
                } else if (this.markers[autobusId]) {
                    // Si la ruta no está habilitada, eliminar el marcador
                    this.eliminarMarcador(autobusId);
                }
            })
            .catch(err => console.error(`Error al obtener información del autobús ${autobusId}:`, err));
    },

    eliminarMarcador: function (autobusId) {
        if (this.markers[autobusId]) {
            this.map.removeLayer(this.markers[autobusId]);
            delete this.markers[autobusId];
        }
    },

    limpiarMarcadores: function () {
        for (const autobusId in this.markers) {
            this.eliminarMarcador(autobusId);
        }
    },

    limpiarRutas: function () {
        for (const rutaId in this.routes) {
            if (this.routes[rutaId] && this.routes[rutaId].polyline) {
                this.map.removeLayer(this.routes[rutaId].polyline);
            }
        }
        this.routes = {};
    },

    crearMarcadorAutobus: function (autobusId, latitud, longitud, nombre = `Autobús ${autobusId}`) {
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
        if (!ruta.habilitada || !ruta.puntosRuta || ruta.puntosRuta.length < 2) return;

        const puntosOrdenados = [...ruta.puntosRuta].sort((a, b) => a.orden - b.orden);
        const puntos = puntosOrdenados.map(p => [p.latitud, p.longitud]);

        const rutaColor = ruta.id === 2 ? 'rgb(51, 136, 255)' : this.getRandomColor();

        const rutaLine = L.polyline(puntos, {
            color: rutaColor,
            weight: 5,
            opacity: 0.7
        }).addTo(this.map);

        rutaLine.bindPopup(`<b>Ruta: ${ruta.descripcion}</b><br>ID: ${ruta.id}`);

        this.routes[ruta.id] = {
            polyline: rutaLine,
            puntos: puntosOrdenados,
            color: rutaColor
        };
    },

    actualizarInfoAutobus: function (autobus) {
        if (!autobus) return;

        // Verificar si la ruta está habilitada
        const rutaHabilitada = autobus.ruta && this.rutasActivas[autobus.ruta.id];

        if (!rutaHabilitada) {
            // Si la ruta no está habilitada, eliminar el marcador
            this.eliminarMarcador(autobus.id);
            return;
        }

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

    actualizarRutaAutobus: async function (autobusId, rutaId) {
        try {
            const response = await fetch(`/api/Rutas/${rutaId}`);
            if (!response.ok) return;

            const rutaData = await response.json();
            const ruta = rutaData.$values ? rutaData.$values : rutaData;

            if (ruta.puntosRuta && ruta.puntosRuta.$values) {
                ruta.puntosRuta = ruta.puntosRuta.$values;
            }

            // Actualizar el estado de habilitación
            this.rutasActivas[rutaId] = ruta.habilitada;

            // Solo mostrar ruta si está habilitada
            if (ruta.habilitada) {
                if (!this.routes[rutaId]) {
                    this.dibujarRuta(ruta);
                }

                const autobusResponse = await fetch(`/api/Autobuses/${autobusId}`);
                if (autobusResponse.ok) {
                    const autobusData = await autobusResponse.json();
                    const autobus = autobusData.$values ? autobusData.$values : autobusData;

                    if (autobus.posiciones && autobus.posiciones.$values) {
                        autobus.posiciones = autobus.posiciones.$values;
                    }

                    this.actualizarInfoAutobus(autobus);
                }
            } else {
                // Si la ruta no está habilitada, eliminar el autobús del mapa
                this.eliminarMarcador(autobusId);
            }
        } catch (err) {
            console.error(`Error al actualizar ruta del autobús ${autobusId}:`, err);
        }
    },
    this.connection.on("ActualizarEstadoRuta", (rutaId, habilitada) => {
        console.log(`Actualizando estado de la ruta ${rutaId}: ${habilitada}`);
        this.rutasActivas[rutaId] = habilitada;
        this.actualizarEstadoVisibilidadRuta(rutaId, habilitada);
    });

    actualizarEstadoVisibilidadRuta: async function (rutaId, habilitada) {
        try {
            // Actualizar el estado almacenado
            this.rutasActivas[rutaId] = habilitada;

            // Obtener la información completa de la ruta
            const response = await fetch(`/api/Rutas/${rutaId}`);
            if (!response.ok) return;

            const rutaData = await response.json();
            const ruta = rutaData.$values ? rutaData.$values : rutaData;

            if (ruta.puntosRuta && ruta.puntosRuta.$values) {
                ruta.puntosRuta = ruta.puntosRuta.$values;
            }

            // Si la ruta debe estar visible pero no la tenemos dibujada
            if (habilitada && !this.routes[rutaId]) {
                this.dibujarRuta(ruta);
            }
            // Si la ruta no debe estar visible pero la tenemos dibujada
            else if (!habilitada && this.routes[rutaId]) {
                if (this.routes[rutaId].polyline) {
                    this.map.removeLayer(this.routes[rutaId].polyline);
                    delete this.routes[rutaId];
                }
            }

            // Actualizar los autobuses asociados a esta ruta
            const autobusesResponse = await fetch('/api/Autobuses');
            if (autobusesResponse.ok) {
                const data = await autobusesResponse.json();
                const autobuses = data.$values || data;

                if (Array.isArray(autobuses)) {
                    for (const autobus of autobuses) {
                        if (autobus.rutaId === rutaId) {
                            if (habilitada && autobus.ruta && autobus.ruta.puntosRuta && autobus.ruta.puntosRuta.length > 0) {
                                // Si ahora está habilitada, mostrar el autobús
                                const puntosRuta = Array.isArray(autobus.ruta.puntosRuta)
                                    ? autobus.ruta.puntosRuta
                                    : autobus.ruta.puntosRuta.$values || [];

                                const puntoActual = puntosRuta.find(p => p.orden === autobus.puntoActual) || puntosRuta[0];

                                if (puntoActual) {
                                    this.crearMarcadorAutobus(autobus.id, puntoActual.latitud, puntoActual.longitud, autobus.nombre);
                                }
                            } else {
                                // Si ahora está deshabilitada, ocultar el autobús
                                this.eliminarMarcador(autobus.id);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`Error al actualizar el estado de visibilidad de la ruta ${rutaId}:`, err);
        }

    },

    actualizarRutasVisibles: async function () {
        try {
            // Recargar todas las rutas para obtener el estado actualizado
            const rutasResponse = await fetch('/api/Rutas');
            if (rutasResponse.ok) {
                const data = await rutasResponse.json();
                const rutas = data.$values || data;

                if (Array.isArray(rutas)) {
                    // Limpiar todas las rutas
                    this.limpiarRutas();
                    // Limpiar todos los marcadores
                    this.limpiarMarcadores();

                    // Actualizar el estado de habilitación y dibujar rutas habilitadas
                    for (const ruta of rutas) {
                        this.rutasActivas[ruta.id] = ruta.habilitada;

                        if (ruta.habilitada) {
                            if (ruta.puntosRuta && ruta.puntosRuta.$values) {
                                ruta.puntosRuta = ruta.puntosRuta.$values;
                            }
                            this.dibujarRuta(ruta);
                        }
                    }
                }
            }

            // Recargar autobuses para mostrar solo los que tienen rutas habilitadas
            await this.cargarDatosIniciales();
        } catch (err) {
            console.error("Error al actualizar rutas visibles:", err);
        }
    },

    iniciarSimulacion: async function () {
        try {
            // Actualizar rutas visibles antes de iniciar la simulación
            await this.actualizarRutasVisibles();
            await fetch('/api/Simulacion/iniciar', { method: 'POST' });
        } catch (err) {
            console.error("Error al iniciar simulación:", err);
        }
    },

    pausarSimulacion: async function () {
        try {
            await fetch('/api/Simulacion/pausar', { method: 'POST' });
        } catch (err) {
            console.error("Error al pausar simulación:", err);
        }
    },

    reiniciarSimulacion: async function () {
        try {
            // Actualizar rutas visibles antes de reiniciar la simulación
            await this.actualizarRutasVisibles();
            await fetch('/api/Simulacion/reiniciar', { method: 'POST' });
        } catch (err) {
            console.error("Error al reiniciar simulación:", err);
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
