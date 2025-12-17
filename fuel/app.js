 // Haversine formula
    function getDistanceKm(lat1, lon1, lat2, lon2) {
      const R = 6371; // Earth radius in km
      const toRad = deg => deg * (Math.PI / 180);
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);

      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    // Load stations and calculate distance
    async function loadStations() {
      try {
        const response = await fetch('http://localhost:3011/fuel');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Get user's location
        navigator.geolocation.getCurrentPosition(position => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;

          // Calculate distance for each station
          data.forEach(station => {
            station.distance = getDistanceKm(userLat, userLon, parseFloat(station.latitude), parseFloat(station.longitude));
          });

          // Sort stations by distance
          data.sort((a, b) => a.distance - b.distance);

          // Display stations
          const list = document.getElementById('stations');
          list.innerHTML = '';
          data.forEach(station => {
            const li = document.createElement('li');
            li.className = `station ${station.status} ${station.sponsored ? 'sponsored' : ''}`;
            li.innerHTML = `
              <strong>${station.name}</strong> <br>
              Status: ${station.status} <br>
              Distance: ${station.distance.toFixed(2)} km <br>
              Coordinates: ${station.latitude}, ${station.longitude} <br>
              ${station.sponsored ? '<em>Sponsored</em>' : ''}
            `;
            list.appendChild(li);
          });

        }, error => {
          console.error('Geolocation error:', error);
          alert('Could not get your location. Enable location services.');
        });

      } catch(err) {
        console.error('Fetch error:', err);
      }
    }

    // Call the function
    loadStations();