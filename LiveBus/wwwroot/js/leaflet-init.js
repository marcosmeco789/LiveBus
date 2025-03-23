// Initialize the map and set it to Madrid, Spain coordinates
let map;

function initializeMap() {
    // Check if the map is already initialized
    if (map) return;
    
    // Initialize the map with Madrid's coordinates
    map = L.map('map').setView([40.416775, -3.703790], 13);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Add a sample marker
    const marker = L.marker([40.416775, -3.703790]).addTo(map);
    marker.bindPopup("<b>Madrid</b><br>Capital de España").openPopup();

    // Add a sample route line
    const routePoints = [
        [40.416775, -3.703790], // Madrid center
        [40.420000, -3.710000], // Sample point 1
        [40.425000, -3.715000], // Sample point 2
        [40.430000, -3.720000]  // Sample point 3
    ];
    
    const routeLine = L.polyline(routePoints, {
        color: 'blue',
        weight: 5,
        opacity: 0.7
    }).addTo(map);

    // Fit map to the route
    map.fitBounds(routeLine.getBounds());
    
    // Make sure the map is rendered correctly by triggering a resize
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

// Handle window resize to update the map
window.addEventListener('resize', function() {
    if (map) {
        map.invalidateSize();
    }
});
