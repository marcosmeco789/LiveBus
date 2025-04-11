// Objeto global para manejar la funcionalidad de ruta con SignalR
window.rutaSignalR = {
    connection: null,
    markers: {},
    routes: {},
    isStarted: false,
    map: null,
    rutaId: null,

    // Configurar el ID de la ruta a mostrar
    setRutaId: function (id) {
        this.rutaId = id;
    },

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
            // Solo actualizar autobuses de la ruta especificada
            this.verificarYActualizarAutobus(autobusId, latitud, longitud);
        });

        this.connection.on("RecibirInfoAutobus", (autobus) => {
            // Solo actualizar autobuses de la ruta especificada
            if (autobus && autobus.rutaId == this.rutaId) {
                this.actualizarInfoAutobus(autobus);
            }
        });

        this.connection.on("RecibirCambioRuta", (autobusId, rutaId) => {
            // Manejar cambios de ruta (añadir o quitar marcadores según corresponda)
            if (rutaId == this.rutaId) {
                this.obtenerYMostrarAutobus(autobusId);
            } else {
                this.eliminarMarcadorAutobus(autobusId);
            }
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
        });
    },

    cargarDatosIniciales: async function () {
        try {
            // Cargar la ruta específica
            await this.cargarRuta();

            // Cargar los autobuses de la ruta
            await this.cargarAutobuses();
        } catch (err) {
            console.error("Error al cargar datos iniciales: ", err);
        }
    },

    cargarRuta: async function () {
        const response = await fetch(`/api/Rutas/${this.rutaId}`);
        if (response.ok) {
            const ruta = await response.json();

            if (ruta.puntosRuta && ruta.puntosRuta.$values) {
                ruta.puntosRuta = ruta.puntosRuta.$values;
            }

            this.dibujarRuta(ruta);
        }
    },

    cargarAutobuses: async function () {
        const response = await fetch('/api/Autobuses');
        if (response.ok) {
            const data = await response.json();
            const autobuses = data.$values || data;

            if (Array.isArray(autobuses)) {
                for (const autobus of autobuses) {
                    // Solo procesar autobuses de esta ruta
                    if (autobus.rutaId == this.rutaId) {
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
            }
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
        if (!ruta.puntosRuta || ruta.puntosRuta.length < 2) return;

        const puntosOrdenados = [...ruta.puntosRuta].sort((a, b) => a.orden - b.orden);
        const puntos = puntosOrdenados.map(p => [p.latitud, p.longitud]);

        const rutaColor = ruta.id === 2 ? 'rgb(51, 136, 255)' : this.getRandomColor();

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
        try {
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
