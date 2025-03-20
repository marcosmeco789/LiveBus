// wwwroot/js/leafletMap.js
var map;
var markers = {};

function inicializarMapa() {
    if (!map) {
        map = L.map('map').setView([40.416775, -3.70379], 13); // Coordenadas para Madrid (puedes cambiarlas)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    }
}

function updateMarker(autobusId, latitud, longitud) {
    if (!map) {
        inicializarMapa();
    }

    if (markers[autobusId]) {
        markers[autobusId].setLatLng([latitud, longitud]);
    } else {
        markers[autobusId] = L.marker([latitud, longitud]).addTo(map);
    }
}

// Exportar funciones para que sean accesibles desde Blazor
window.inicializarMapa = inicializarMapa;
window.updateMarker = updateMarker;
