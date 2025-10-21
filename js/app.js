// Initialize Leaflet map
const map = L.map('map').setView([14.62, 121.107], 15);

// Base tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// === Layer holders ===
let barangayLayers = {};
let subdivisionLayers = {};
let pointMarkers = [];

// === Barangay GeoJSON ===
fetch('data/barangay_mayamot.geojson')
  .then(res => res.json())
  .then(data => {
    const layer = L.geoJSON(data, {
      style: { color: 'blue', weight: 2, fillOpacity: 0.1 }
    }).addTo(map);
    barangayLayers['Barangay Mayamot'] = layer;

    document.getElementById('barangay-mayamot').addEventListener('change', e => {
      if (e.target.checked) map.addLayer(layer);
      else map.removeLayer(layer);
    });
  });

// === Subdivision GeoJSONs ===
const subdivisionFiles = ['subdivision1.geojson', 'subdivision2.geojson'];
const subdivisionList = document.getElementById('subdivision-checkboxes');
const subdivisionFilter = document.getElementById('subdivision-filter');

subdivisionFiles.forEach(file => {
  const name = file.replace('.geojson', '');
  fetch(`data/${file}`)
    .then(res => res.json())
    .then(data => {
      const layer = L.geoJSON(data, {
        style: { color: 'green', weight: 1.5, fillOpacity: 0.15 }
      }).addTo(map);

      subdivisionLayers[name] = layer;

      // Create checkbox for each subdivision
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" id="${name}" checked> ${name}`;
      subdivisionList.appendChild(label);

      label.querySelector('input').addEventListener('change', e => {
        if (e.target.checked) map.addLayer(layer);
        else map.removeLayer(layer);
      });

      // Add to filter dropdown
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      subdivisionFilter.appendChild(opt);
    });
});

// === Load Points from CSV ===
Papa.parse('data/points.csv', {
  download: true,
  header: true,
  complete: function(results) {
    const data = results.data;

    data.forEach(row => {
      if (!row.LATITUDE || !row.LONGITUDE) return;

      const lat = parseFloat(row.LATITUDE);
      const lng = parseFloat(row.LONGITUDE);

      if (isNaN(lat) || isNaN(lng)) return;

      const popup = `
        <b>${row.SUBDIVISION || 'N/A'}</b><br>
        ${row.STREET || ''}<br>
        ${row.BARANGAY || ''}, ${row.CITY || ''}<br>
        NAP: ${row.NAP || ''}
      `;

      const marker = L.marker([lat, lng]).bindPopup(popup);
      marker.subdivision = row.SUBDIVISION;
      marker.addTo(map);
      pointMarkers.push(marker);
    });

    // Populate subdivision filter (from CSV data)
    const uniqueSubs = [...new Set(data.map(d => d.SUBDIVISION).filter(Boolean))];
    uniqueSubs.forEach(name => {
      if (!Array.from(subdivisionFilter.options).some(opt => opt.value === name)) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        subdivisionFilter.appendChild(opt);
      }
    });

    // Filter points based on dropdown selection
    subdivisionFilter.addEventListener('change', e => {
      const selected = e.target.value;
      pointMarkers.forEach(marker => {
        if (selected === 'All' || marker.subdivision === selected) {
          map.addLayer(marker);
        } else {
          map.removeLayer(marker);
        }
      });
    });
  }
});

// === Sidebar toggle ===
document.getElementById('toggleSidebar').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});
