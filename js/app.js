// Initialize the map
const map = L.map('map').setView([14.62, 121.107], 15);

// Base tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// Layer containers
let barangayLayers = {};
let subdivisionLayers = {};
let pointMarkers = [];

// === Load Barangay GeoJSON ===
fetch('data/barangay_mayamot.geojson')
  .then(res => res.json())
  .then(data => {
    const layer = L.geoJSON(data, {
      style: { color: 'blue', weight: 2, fillOpacity: 0.1 }
    }).addTo(map);

    barangayLayers['Barangay Mayamot'] = layer;

    // Checkbox toggle
    document.getElementById('barangay-mayamot').addEventListener('change', e => {
      if (e.target.checked) map.addLayer(layer);
      else map.removeLayer(layer);
    });
  });

// === Load Subdivision GeoJSONs ===
const subdivisionFiles = [
  { file: 'subdivision1.geojson', name: 'Broadway Pines' },
  { file: 'subdivision2.geojson', name: 'Far East Asia' },
  { file: 'subdivision3.geojson', name: 'Filinvest East Homes' }
];

const subdivisionList = document.getElementById('subdivision-checkboxes');
const subdivisionFilter = document.getElementById('subdivision-filter');

subdivisionFiles.forEach(item => {
  fetch(`data/${item.file}`)
    .then(res => res.json())
    .then(data => {
      const layer = L.geoJSON(data, {
        style: { color: 'green', weight: 1.5, fillOpacity: 0.15 }
      }).addTo(map);

      subdivisionLayers[item.name] = layer;

      // Create checkbox
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" id="${item.name}" checked> ${item.name}`;
      subdivisionList.appendChild(label);

      label.querySelector('input').addEventListener('change', e => {
        if (e.target.checked) map.addLayer(layer);
        else map.removeLayer(layer);
      });

      // Add to filter dropdown
      const opt = document.createElement('option');
      opt.value = item.name;
      opt.textContent = item.name;
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

    // Populate filter from CSV subdivisions if missing
    const csvSubdivisions = [...new Set(data.map(d => d.SUBDIVISION).filter(Boolean))];
    csvSubdivisions.forEach(name => {
      if (!Array.from(subdivisionFilter.options).some(opt => opt.value === name)) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        subdivisionFilter.appendChild(opt);
      }
    });

    // Filter points on dropdown change
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
