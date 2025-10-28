// Initialize map
const map = L.map('map').setView([14.62, 121.11], 14);

// Base tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// Store all point markers
let pointMarkers = [];

// Store subdivision and barangay layers
let subdivisionLayers = {};
let barangayLayers = {};

// Store CSV data globally
let csvData = [];

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
        csvData = results.data;

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

            marker.subdivision = row.SUBDIVISION;
            marker.NAP = row.NAP;
            marker.originalLatLng = [row.LATITUDE, row.LONGITUDE];
            marker.expanded = false;

            // Click to expand overlapping points
            marker.on('click', () => toggleExpand(marker));

            marker.addTo(map);
            pointMarkers.push(marker);
          }
        });

        // Add filters after CSV is ready
        addSubdivisionFilter();
        addNAPFilter();
        updateNAPFilter(); // fill NAP dropdown initially
      }
    });

  })
  .catch(err => console.error('Error loading index.json:', err));


// ---- CLICK TO EXPAND POINTS ----
function toggleExpand(marker) {
  const lat = marker.originalLatLng[0];
  const lng = marker.originalLatLng[1];
  const count = pointMarkers.filter(m => m.originalLatLng[0] === lat && m.originalLatLng[1] === lng).length;

  if (!marker.expanded && count > 1) {
    const offset = 0.00005;
    pointMarkers.filter(m => m.originalLatLng[0] === lat && m.originalLatLng[1] === lng).forEach((m, i) => {
      const angle = (i / count) * (2 * Math.PI);
      const newLat = lat + Math.sin(angle) * offset;
      const newLng = lng + Math.cos(angle) * offset;
      m.setLatLng([newLat, newLng]);
      m.setStyle({ radius: 12 });
      m.openPopup();
      m.expanded = true;
    });
  } else {
    pointMarkers.filter(m => m.originalLatLng[0] === lat && m.originalLatLng[1] === lng).forEach(m => {
      m.setLatLng(m.originalLatLng);
      m.setStyle({ radius: 8 });
      m.expanded = false;
    });
  }
}


// ---- ADD SUBDIVISION FILTER ----
function addSubdivisionFilter() {
  const filterDiv = document.createElement('div');
  filterDiv.innerHTML = `
    <strong>Filter Points by Subdivision:</strong>
    <select id="subdivision-filter">
      <option value="All" selected>All</option>
    </select>
  `;
  document.querySelector('#filters').appendChild(filterDiv);

  const subdivisions = [...new Set(csvData.map(d => d.SUBDIVISION))];
  const select = document.querySelector('#subdivision-filter');
  subdivisions.forEach(sub => select.appendChild(new Option(sub, sub)));

  select.addEventListener('change', () => {
    applyFilters();
    updateNAPFilter(); // update NAP dropdown based on subdivision
  });
}


// ---- ADD NAP FILTER ----
function addNAPFilter() {
  const filterDiv = document.createElement('div');
  filterDiv.innerHTML = `
    <strong>Filter Points by NAP:</strong>
    <select id="nap-filter">
      <option value="All" selected>All</option>
    </select>
  `;
  document.querySelector('#filters').appendChild(filterDiv);

  const select = document.querySelector('#nap-filter');
  select.addEventListener('change', applyFilters);
}


// ---- UPDATE NAP OPTIONS BASED ON SUBDIVISION ----
function updateNAPFilter() {
  const subdivisionVal = document.querySelector('#subdivision-filter').value;
  const napSelect = document.querySelector('#nap-filter');

  // Clear existing options
  napSelect.innerHTML = '';
  napSelect.appendChild(new Option('All', 'All', true, true));

  let filteredNAPs;
  if (subdivisionVal === 'All') {
    filteredNAPs = [...new Set(csvData.map(d => d.NAP))].sort();
  } else {
    filteredNAPs = [...new Set(csvData.filter(d => d.SUBDIVISION === subdivisionVal).map(d => d.NAP))].sort();
  }

  filteredNAPs.forEach(n => napSelect.appendChild(new Option(n, n)));
}


// ---- APPLY FILTERS ----
function applyFilters() {
  const subdivisionVal = document.querySelector('#subdivision-filter').value;
  const napVal = document.querySelector('#nap-filter').value;

  pointMarkers.forEach(marker => {
    let show = true;

    // Filter by subdivision
    if (subdivisionVal !== 'All') {
      show = marker.subdivision === subdivisionVal;
    }

    // Filter by NAP (overrides subdivision if selected)
    if (napVal !== 'All') {
      show = marker.NAP === napVal;
    }

    if (show) marker.addTo(map);
    else map.removeLayer(marker);
  });
}


// ---- SEARCH FUNCTIONALITY ----
document.getElementById('search-btn').addEventListener('click', searchNAP);
document.getElementById('nap-search').addEventListener('keypress', e => {
  if (e.key === 'Enter') searchNAP();
});

function searchNAP() {
  const query = document.getElementById('nap-search').value.trim().toUpperCase();

  if (!query) {
    alert('Please enter a NAP ID to search.');
    return;
  }

  const targetMarker = pointMarkers.find(m => m.NAP && m.NAP.toUpperCase() === query);

  if (targetMarker) {
    map.setView(targetMarker.getLatLng(), 18);
    targetMarker.openPopup();

    // Highlight briefly
    targetMarker.setStyle({ fillColor: 'yellow' });
    setTimeout(() => targetMarker.setStyle({ fillColor: 'red' }), 1200);
  } else {
    alert(`NAP "${query}" not found.`);
  }
}
