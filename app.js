// Initialize map
const map = L.map('map').setView([14.62, 121.11], 14);

// Base tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// Store all point markers
let pointMarkers = [];

// Store subdivision and barangay layers
let subdivisionLayers = {};
let barangayLayers = {};

// Load index.json
fetch('data/index.json')
  .then(res => res.json())
  .then(indexData => {

    // ---- BARANGAY LAYERS ----
    indexData.barangays.forEach(file => {
      const name = file.replace('.geojson','').replaceAll('_',' ');
      fetch(`data/${file}`).then(res => res.json()).then(data => {
        const layer = L.geoJSON(data, { style: { color:'blue', weight:2, fillOpacity:0.1 }}).addTo(map);
        barangayLayers[name] = layer;
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
        subdivisionLayers[name] = layer;
        const checkbox = document.createElement('label');
        checkbox.innerHTML = `<input type="checkbox" checked> ${name}`;
        document.querySelector('#subdivision-section').appendChild(checkbox);
        checkbox.querySelector('input').addEventListener('change', e => {
          e.target.checked ? map.addLayer(layer) : map.removeLayer(layer);
        });
      });
    });

    // ---- LOAD CSV POINTS ----
    Papa.parse('data/points.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: function(results) {
        const csvData = results.data;

        // Create markers
        csvData.forEach(row => {
          if (row.LATITUDE && row.LONGITUDE) {
            const marker = L.circleMarker([row.LATITUDE, row.LONGITUDE], {
              radius: 8,
              fillColor: 'red',
              color: '#fff',
              weight: 1,
              fillOpacity: 0.9
            }).bindPopup(`<strong>${row.NAP}</strong><br>${row.STREET}, ${row.SUBDIVISION}`);

            marker.subdivision = row.SUBDIVISION; // attach subdivision info
            marker.NAP = row.NAP; // attach NAP info
            marker.addTo(map);
            pointMarkers.push(marker);
          }
        });

        // Add filters AFTER CSV is loaded
        addSubdivisionFilter(csvData);
        addNAPFilter(csvData);
      }
    });

  })
  .catch(err => console.error('Error loading index.json:', err));


// ---- SUBDIVISION FILTER ----
function addSubdivisionFilter(data) {
  const filterDiv = document.createElement('div');
  filterDiv.innerHTML = `
    <strong>Filter Points by Subdivision:</strong>
    <select id="subdivision-filter">
      <option value="All" selected>All</option>
    </select>
  `;
  document.querySelector('#filters').appendChild(filterDiv);

  const subdivisions = [...new Set(data.map(d => d.SUBDIVISION))];
  const select = document.querySelector('#subdivision-filter');
  subdivisions.forEach(sub => {
    const option = document.createElement('option');
    option.value = sub;
    option.textContent = sub;
    select.appendChild(option);
  });

  select.addEventListener('change', applyFilters);
}


// ---- NAP FILTER ----
function addNAPFilter(data) {
  const filterDiv = document.createElement('div');
  filterDiv.innerHTML = `
    <strong>Filter Points by NAP:</strong>
    <select id="nap-filter">
      <option value="All" selected>All</option>
    </select>
  `;
  document.querySelector('#filters').appendChild(filterDiv);

  const naps = [...new Set(data.map(d => d.NAP))].sort();
  const select = document.querySelector('#nap-filter');
  naps.forEach(nap => {
    const option = document.createElement('option');
    option.value = nap;
    option.textContent = nap;
    select.appendChild(option);
  });

  select.addEventListener('change', applyFilters);
}


// ---- APPLY FILTERS ----
function applyFilters() {
  const subdivisionVal = document.querySelector('#subdivision-filter').value;
  const napVal = document.querySelector('#nap-filter').value;

  pointMarkers.forEach(marker => {
    let show = true;

    // Subdivision filter
    if (subdivisionVal !== "All") {
      show = marker.subdivision === subdivisionVal;
    }

    // NAP filter overrides subdivision
    if (napVal !== "All") {
      show = marker.NAP === napVal;
    }

    if (show) marker.addTo(map);
    else map.removeLayer(marker);
  });
}
