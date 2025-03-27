// Objeto global para manejar la visualización de una ruta específica
window.rutaMapa = {
    map: null,
    routeLine: null,

    // Inicializa el mapa
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

    // Muestra una ruta específica en el mapa
    mostrarRuta: function (ruta) {
        if (!this.map) return;
        
        // Limpiar cualquier ruta anterior
        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
            this.routeLine = null;
        }
        
        // Si no hay puntos, no podemos mostrar nada
        if (!ruta || !ruta.puntosRuta || ruta.puntosRuta.length < 2) {
            console.error("La ruta no tiene suficientes puntos para ser mostrada");
            return;
        }
        
        // Extraer puntos de la ruta (manejar variaciones en el formato de datos)
        let puntos = ruta.puntosRuta;
        if (ruta.puntosRuta.$values) {
            puntos = ruta.puntosRuta.$values;
        }
        
        // Ordenar los puntos por el campo 'orden'
        const puntosOrdenados = [...puntos].sort((a, b) => a.orden - b.orden);
        
        // Convertir a formato de coordenadas para Leaflet
        const coordenadas = puntosOrdenados.map(p => [p.latitud, p.longitud]);
        
        // Dibujar la línea de la ruta
        this.routeLine = L.polyline(coordenadas, {
            color: '#3388ff',
            weight: 5,
            opacity: 0.7
        }).addTo(this.map);
        
        // Añadir marcadores para el inicio y fin de la ruta
        const inicio = coordenadas[0];
        const fin = coordenadas[coordenadas.length - 1];
        
        // Crear iconos personalizados para inicio y fin
        const inicioIcon = L.divIcon({
            className: 'inicio-icon',
            html: '<i class="fa fa-play-circle" style="color: green; font-size: 24px;"></i>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        const finIcon = L.divIcon({
            className: 'fin-icon',
            html: '<i class="fa fa-stop-circle" style="color: red; font-size: 24px;"></i>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        // Añadir marcadores al mapa
        L.marker(inicio, { icon: inicioIcon }).addTo(this.map)
            .bindPopup('Inicio de la ruta');
        
        L.marker(fin, { icon: finIcon }).addTo(this.map)
            .bindPopup('Fin de la ruta');
        
        // Ajustar la vista para mostrar toda la ruta
        this.map.fitBounds(this.routeLine.getBounds(), { padding: [50, 50] });
        
        // Mostrar información de la ruta
        this.routeLine.bindPopup(`<b>Ruta: ${ruta.descripcion}</b><br>Total de puntos: ${puntosOrdenados.length}`);
    }
};
