// Initialize map
const map = L.map('map').setView([14.62, 121.11], 14);

// Base tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// Load index.json
fetch('data/index.json')
  .then(res => res.json())
  .then(indexData => {

    // ---- BARANGAY LAYERS ----
    indexData.barangays.forEach(file => {
      const name = file.replace('.geojson','').replaceAll('_',' ');
      fetch(`data/${file}`).then(res => res.json()).then(data => {
        const layer = L.geoJSON(data, { style: { color:'blue', weight:2, fillOpacity:0.1 }}).addTo(map);
        const checkbox = document.createElement('label');
        checkbox.innerHTML = `<input type="checkbox" checked> ${name}`;
        document.querySelector('#barangay-section').appendChild(checkbox);
        checkbox.querySelector('input').addEventListener('change', e => {
          e.target.checked ? map.addLayer(layer) : map.removeLayer(layer);
        });
      });
    });

    // ---- SUBDIVISION LAYERS ----
    indexData.subdivisions.forEach(file => {
      const name = file.replace('.geojson','').replaceAll('_',' ');
      fetch(`data/${file}`).then(res => res.json()).then(data => {
        const layer = L.geoJSON(data, { style: { color:'green', weight:1.5, fillOpacity:0.15 }}).addTo(map);
        const checkbox = document.createElement('label');
        checkbox.innerHTML = `<input type="checkbox" checked> ${name}`;
        document.querySelector('#subdivision-section').appendChild(checkbox);
        checkbox.querySelector('input').addEventListener('change', e => {
          e.target.checked ? map.addLayer(layer) : map.removeLayer(layer);
        });
      });
    });

  })
  .catch(err => console.error('Error loading index.json:', err));
