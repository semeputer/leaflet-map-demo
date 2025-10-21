fetch('data/index.json')
  .then(res => res.json())
  .then(indexData => {
    // --- Barangays ---
    indexData.barangays.forEach(file => {
      const name = file.replace('.geojson', '').replaceAll('_', ' ');
      fetch(`data/${file}`)
        .then(res => res.json())
        .then(data => {
          const layer = L.geoJSON(data, {
            style: { color: 'blue', weight: 2, fillOpacity: 0.1 }
          }).addTo(map);

          const checkbox = document.createElement('label');
          checkbox.innerHTML = `<input type="checkbox" class="barangay-box" checked> ${name}`;
          document.querySelector('#barangay-section').appendChild(checkbox);

          checkbox.querySelector('input').addEventListener('change', e => {
            e.target.checked ? map.addLayer(layer) : map.removeLayer(layer);
          });
        });
    });

    // --- Subdivisions ---
    indexData.subdivisions.forEach(file => {
      const name = file.replace('.geojson', '').replaceAll('_', ' ');
      fetch(`data/${file}`)
        .then(res => res.json())
        .then(data => {
          const layer = L.geoJSON(data, {
            style: { color: 'green', weight: 1.5, fillOpacity: 0.15 }
          }).addTo(map);

          const checkbox = document.createElement('label');
          checkbox.innerHTML = `<input type="checkbox" class="subdiv-box" checked> ${name}`;
          document.querySelector('#subdivision-section').appendChild(checkbox);

          checkbox.querySelector('input').addEventListener('change', e => {
            e.target.checked ? map.addLayer(layer) : map.removeLayer(layer);
          });
        });
    });
  });