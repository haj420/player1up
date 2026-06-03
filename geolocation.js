const PLAYER_1UP_LAT =  34.925071;
const PLAYER_1_UP_LNG = -81.027019;

document.getElementById("locateBtn").addEventListener("click", () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(success, error);
});

function success(position) {
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    const distance = haversineDistance(
        { lat: userLat, lng: userLng },
        { lat: PLAYER_1UP_LAT, lng: PLAYER_1_UP_LNG }
    );

    const mapsUrl = `https://www.google.com/maps/dir/${userLat},${userLng}/${PLAYER_1UP_LAT},${PLAYER_1_UP_LNG}`;

    document.getElementById("locationResult").innerHTML = `
        <p>You are <strong>${distance.toFixed(2)} miles</strong> from Player 1UP.</p>
        <a href="${mapsUrl}" target="_blank">Get Directions</a>
    `;
}

function error() {
    alert("Unable to retrieve your location.");
}

function haversineDistance(coords1, coords2) {
    const R = 3958.8; // miles
    const rlat1 = coords1.lat * (Math.PI/180);
    const rlat2 = coords2.lat * (Math.PI/180);
    const difflat = rlat2 - rlat1;
    const difflon = (coords2.lng - coords1.lng) * (Math.PI/180);

    const a = Math.sin(difflat/2) * Math.sin(difflat/2) +
              Math.cos(rlat1) * Math.cos(rlat2) *
              Math.sin(difflon/2) * Math.sin(difflon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
