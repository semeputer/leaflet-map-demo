// Initialize map
const map = L.map('map').setView([14.62, 121.11], 14);

// Base tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// Store layers and markers
let subdivisionLayers = {};
let barangayLayers = {};
let pointMarkers = [];
let coordMap = {};
let csvData = [];

// ---- LOAD INDEX.JSON FOR SUBDIVISIONS AND BARANGAYS ----
fetch('data/index.json')
  .then(res => res.json())
  .then(indexData => {

    // --- BARANGAY LAYERS ---
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

    // --- SUBDIVISION LAYERS ---
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
        csvData = results.data; // store for filtering

        results.data.forEach(row => {
          if (!row.LATITUDE || !row.LONGITUDE) return;

          const key = `${row.LATITUDE},${row.LONGITUDE}`;
          if (!coordMap[key]) coordMap[key] = [];
          coordMap[key].push(row.NAP);
        });

        // Create markers from grouped coordinates
        for (const key in coordMap) {
          const [lat, lng] = key.split(',').map(Number);
          const naps = coordMap[key];

          // Get all subdivisions for these NAPs
          const subdivs = csvData.filter(d => naps.includes(d.NAP)).map(d => d.SUBDIVISION);

          const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: 'red',
            color: '#fff',
            weight: 1,
            fillOpacity: 0.9
          }).addTo(map);

          marker.naps = naps;
          marker.napsSubdivisions = [...new Set(subdivs)];
          marker.originalLatLng = [lat, lng];
          marker.expanded = false;

          // Bind initial popup
          if (naps.length === 1) {
            marker.bindPopup(`NAP: ${naps[0]}`);
          } else {
            marker.bindPopup(`Click to expand ${naps.length} NAPs`);
          }

          // Click to expand/collapse
          marker.on('click', () => toggleExpand(marker));
          pointMarkers.push(marker);
        }

        // Add filters
        addSubdivisionFilter(csvData);
        addNAPFilter(csvData);
      }
    });

  })
  .catch(err => console.error('Error loading index.json:', err));


// ---- EXPAND / COLLAPSE FUNCTION ----
function toggleExpand(marker) {
  const lat = marker.originalLatLng[0];
  const lng = marker.originalLatLng[1];
  const count = marker.naps.length;

  if (!marker.expanded && count > 1) {
    // Expand: spread overlapping points
    const offset = 0.00005;
    marker.naps.forEach((nap, i) => {
      const angle = (i / count) * (2 * Math.PI);
      const newLat = lat + Math.sin(angle) * offset;
      const newLng = lng + Math.cos(angle) * offset;

      marker.setLatLng([newLat, newLng]);
      marker.setStyle({ radius: 12 });
      marker.bindPopup(`NAP: ${nap}`).openPopup();
    });
    marker.expanded = true;
  } else {
    // Collapse
    marker.setLatLng(marker.originalLatLng);
    marker.setStyle({ radius: 8 });
    marker.bindPopup(count === 1 ? `NAP: ${marker.naps[0]}` : `Click to expand ${count} NAPs`);
    marker.expanded = false;
    marker.openPopup();
  }
}


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

  select.addEventListener('change', () => applyFilters());
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
  naps.forEach(n => {
    const option = document.createElement('option');
    option.value = n;
    option.textContent = n;
    select.appendChild(option);
  });

  select.addEventListener('change', () => applyFilters());
}


// ---- APPLY FILTERS ----
function applyFilters() {
  const subdivisionVal = document.querySelector('#subdivision-filter').value;
  const napVal = document.querySelector('#nap-filter').value;

  pointMarkers.forEach(marker => {
    const markerSubdivision = marker.napsSubdivisions;
    const markerNAPs = marker.naps;

    let show = true;

    // Subdivision filter
    if (subdivisionVal !== "All") {
      show = markerSubdivision.includes(subdivisionVal);
    }

    // NAP filter (overrides subdivision filter)
    if (napVal !== "All") {
      show = markerNAPs.includes(napVal);
    }

    if (show) marker.addTo(map);
    else map.removeLayer(marker);
  });
}
