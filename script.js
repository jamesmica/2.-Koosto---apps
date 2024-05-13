var data;
var lat;
var lon;
var currentIsochrone;
var codes;
var grillePoints = [];
var mode;
var markers;
var dataCarreaux;
var totalPointsInsideIsochrone = 0; // Initialiser à zéro au début
var sumInd = 0;
var countTiles = 0;

var data = {"lat":48.86666,"lon":2.333333,"mode":"driving","time":10};
var lat = data.lat;
var lon = data.lon;

let codesINSEE = new Set();

function initialiserCarte() {
    const carte = L.map('maCarte', {
        maxZoom: 18,
        minZoom: 4
    }).setView([48.8566, 2.3522], 13); // Default view is set to Paris

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(carte);

    return carte;
}

var carte = initialiserCarte();

function testChargerDonnees() {
    const testEvent = {
        origin: 'https://koosto.fr',
        data: JSON.stringify({"lat":48.86666, "lon":2.333333, "mode":"driving", "time":10})
    };
    window.dispatchEvent(new MessageEvent('message', testEvent));
}

window.addEventListener("message", async function(event) {
    if (!['http://koosto.fr', 'http://editor.weweb.io', 'https://editor.weweb.io', 'https://koosto.fr', 'https://www.koosto.fr'].includes(event.origin)) {
        alert('Origine inconnue : ', event.origin);
        return;
    }

    resetMap(); // Réinitialisez la carte et les données.
    codesINSEE.clear(); // Très important pour ne pas garder les anciens codes INSEE.
    grillePoints = [];

    data = JSON.parse(event.data);
    lat = data.lat;
    lon = data.lon;

    console.log("Reçu : " + event.data);
    try {
        data = JSON.parse(event.data);
        lat = data.lat;
        lon = data.lon;
        console.log(data.mode);
        if (data.mode=="driving") {
            mode = "driving";
        }  else {
            mode = "walking";
        } ;

        resetMap(); // Réinitialisez la carte et les données.
        codesINSEE.clear(); // Très important pour ne pas garder les anciens codes INSEE.
        grillePoints = [];
        await chargerIsochroneEtListerCommunes();
        await updateMap(); // Assurez-vous que cette fonction gère correctement les promesses.

    } catch (error) {
        console.error("Erreur lors du traitement de l'événement message:", error);
    }
});

// Appelez testChargerDonnees() après avoir défini l'écouteur
testChargerDonnees();


function resetMap() {
    carte.eachLayer((layer) => {
        if (!layer._url) { // Supprimez toutes les couches sauf la couche de tuiles basée sur l'URL.
            carte.removeLayer(layer);
        }
    });
    if (currentIsochrone) {
        currentIsochrone.remove(); // Assurez-vous de supprimer l'isochrone actuel s'il existe.
    }
}

async function chargerXlsx(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, {type: 'array'});
    return workbook;
}

function fetchIsochrone(map, center) {
    var apiKey = 'pk.eyJ1IjoiamFtZXNpdGhlYSIsImEiOiJjbG93b2FiaXEwMnVpMmpxYWYzYjBvOTVuIn0.G2rAo0xl14oye9YVz4eBcw';
    var url = `https://api.mapbox.com/isochrone/v1/mapbox/${center.mode}/${center.lon},${center.lat}?contours_minutes=${center.time || 10}&polygons=true&access_token=${apiKey}`;

    return new Promise((resolve, reject) => {
        fetch(url)
        .then(response => response.json())
        .then(data => {
            if (currentIsochrone) {
                currentIsochrone.remove();
            }
            var coords = data.features[0].geometry.coordinates[0];
            var latLngs = coords.map(coord => ([coord[1], coord[0]]));

            currentIsochrone = L.polygon(latLngs, {
                color: '#FF0000',
                weight: 2,
                opacity: 0.8,
                fillColor: '#007aff',
                fillOpacity: 0.3,
                interactive: false  // Désactiver les événements de clic sur cette couche
            }).addTo(map);

            var bounds = currentIsochrone.getBounds();
            carte.fitBounds(bounds);
            resolve(currentIsochrone);
        })
        .catch(error => {
            console.log('Erreur lors de la récupération des isochrones :', error);
            reject(error);
        });
    });
}



function creerGrillePointsEtAfficherSurCarte(isochrone, pas, map) {
    // console.log('creerGrillePointsEtAfficherSurCarte(isochrone, pas, map)');
    const bbox = turf.bbox(isochrone.toGeoJSON());
    let grillePoints = [];

    // Générer une grille de points à l'intérieur des bornes
    for (let lon = bbox[0]; lon <= bbox[2]; lon += pas) {
        for (let lat = bbox[1]; lat <= bbox[3]; lat += pas) {
            let point = turf.point([lon, lat]);
            // Vérifier si le point est à l'intérieur de l'isochrone
            if (turf.booleanPointInPolygon(point, isochrone.toGeoJSON())) {
                grillePoints.push([lat, lon]); // Stocker les points valides
                
                // Afficher le point sur la carte
                // L.marker([lat, lon]).addTo(map);
            }
        }
    }

    return grillePoints;
}

async function listerCommunesCouvertesParIsochrone(isochrone) {

    let grillePoints = creerGrillePointsEtAfficherSurCarte(isochrone, 0.005, carte);
    for (let point of grillePoints) {
        const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${point[1]}&lat=${point[0]}`;
        try {
            const response = await fetch(url);
            const dataReverse = await response.json();
            if (dataReverse.features && dataReverse.features.length > 0) {
                const codeINSEE = dataReverse.features[0].properties.citycode;
                codesINSEE.add(codeINSEE);
                // Ne pas retourner ici, continuez à collecter les codes INSEE
            } else {
                console.error('Communes couvertes isochrone: aucun résultat trouvé pour le point:', point[0], point[1]);
                // Ne pas retourner ici, continuez à traiter les autres points
            }
        } catch (error) {
            console.error('Erreur lors du géocodage du point:', 'lat', point[0], 'lon', point[1], error);
            // Ne pas retourner ici, continuez à traiter les autres points
        }
    }

    // Retournez tous les codes INSEE collectés après avoir traité tous les points
    return Array.from(codesINSEE);
}


async function chargerIsochroneEtListerCommunes() {
    try {
        await fetchIsochrone(carte, {"lat":data.lat,"lon":data.lon,"mode":mode,"time":10});
        codes = null;
        var codes = await listerCommunesCouvertesParIsochrone(currentIsochrone);
        console.log("Codes INSEE des communes touchées:", codes);
        await chargerEtablissements(codes);

    } catch (error) {
        console.error('Erreur:', error);
    }
}

async function chargerEtablissements(codesINSEEArray) {
    let codesINSEESet = new Set(codesINSEEArray);

    var iconSingle = L.icon({
        iconUrl: 'img/pin.png',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    });

    var iconMultiple = L.icon({
        iconUrl: 'img/multipin.png',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    });

    try {
        const workbook = await chargerXlsx('bpe/inf/inf.xlsx');
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: true });

        // Compter les occurrences des coordonnées pour déterminer les icônes multiples
        let coordCounts = {};
        let points = {};  // Pour stocker les points et vérifier si ils sont à l'intérieur de l'isochrone
        json.forEach(entry => {
            let coordKey = `${entry.Latitude},${entry.Longitude}`;
            coordCounts[coordKey] = (coordCounts[coordKey] || 0) + 1;
            points[coordKey] = entry;
        });

        Object.keys(points).forEach(coordKey => {
            const [lat, lon] = coordKey.split(',');
            const entry = points[coordKey];
            let point = turf.point([parseFloat(lon), parseFloat(lat)]);
            if (turf.booleanPointInPolygon(point, currentIsochrone.toGeoJSON())) {
                // Le point est à l'intérieur de l'isochrone
                const codeINSEEPoint = entry.DEPCOM;
                if (codesINSEESet.has(codeINSEEPoint)) {
                    let markerIcon = coordCounts[coordKey] > 1 ? iconMultiple : iconSingle;
                    let marker = L.marker([parseFloat(lat), parseFloat(lon)], {icon: markerIcon, title: codeINSEEPoint}).addTo(carte);
                    marker.bindPopup(`Code INSEE: ${codeINSEEPoint}`);
                    totalPointsInsideIsochrone += 1;
                }
            }
        });
    } catch (error) {
        console.error("Erreur lors du chargement des établissements:", error);
    }
}



    async function updateMap() {
        if (!codesINSEE || codesINSEE.size === 0) {
            console.error("Aucun code INSEE disponible pour charger les GeoJSON.");
            return;
        }
    
        let uniqueIds = new Set(); // Ensemble pour stocker les identifiants uniques
        countTiles = 0; // Compteur pour le nombre de carreaux uniques
        let sumInd = 0; // Somme des valeurs de 'ind' pour les carreaux uniques
    
        // Supprimer toutes les couches GeoJSON existantes
        carte.eachLayer(layer => {
            if (layer instanceof L.GeoJSON) {
                carte.removeLayer(layer);
            }
        });
    
        // Charger tous les GeoJSON et les fusionner
        let allFeatures = []; // Pour stocker toutes les caractéristiques de tous les GeoJSON
        for (let codeINSEE of codesINSEE) {
            try {
                const geojsonUrl = `shp_test/${codeINSEE}.geojson`;
                const response = await fetch(geojsonUrl);
                if (!response.ok) {
                    console.error(`Erreur lors du chargement des données GeoJSON pour le code INSEE ${codeINSEE}: ${response.status}`);
                    continue;
                }
                let dataCarreaux = await response.json();
                allFeatures = allFeatures.concat(dataCarreaux.features); // Fusionner les caractéristiques
            } catch (error) {
                console.error(`Erreur lors du chargement du GeoJSON pour le code INSEE ${codeINSEE}:`, error);
            }
        }
    
        // Filtrer et traiter toutes les caractéristiques fusionnées
        let filteredFeatures = allFeatures.filter(feature => {
            let idCar = feature.properties.idcar_200m;
            if (!uniqueIds.has(idCar) && turf.intersect(feature.geometry, currentIsochrone.toGeoJSON())) {
                uniqueIds.add(idCar); // Ajouter l'identifiant au Set pour éviter les doublons
                countTiles++; // Incrémenter le compteur pour chaque carreau unique
                sumInd += feature.properties.ind || 0; // Ajouter la valeur de 'ind' à la somme
                return true;
            }
            return false;
        });

        // Afficher le résultat final après le traitement de toutes les caractéristiques
        console.log(`Nombre de carreaux uniques à l'intérieur de l'isochrone: ${countTiles}, Somme de 'ind' pour ces carreaux: ${sumInd}`);
        
        const dataToSend2 = {
            type: 'tilesInsideIsochrone',
            tiles: countTiles,
            pop: sumInd
        };
    
        console.log(dataToSend2);
    
        // Send data to the parent window
        window.parent.postMessage(dataToSend2, 'https://www.koosto.fr'); // Replace '*' with the actual origin of the parent for security
        window.parent.postMessage(dataToSend2, 'https://editor.weweb.io');
        // Reset the counter for next use
        countTiles = 0;
        sumInd = 0;

        // Mettre l'isochrone au premier plan après avoir ajouté les carreaux
        if (currentIsochrone) {
            currentIsochrone.bringToFront();
        }
        finalizeDisplay();
    }
    
    async function finalizeDisplay() {
        console.log(`Nombre total de points à l'intérieur de l'isochrone : ${totalPointsInsideIsochrone}`);
        const dataToSend = {
            type: 'pointsInsideIsochrone',
            count: totalPointsInsideIsochrone
        };
    
        console.log(dataToSend);
    
        // Send data to the parent window
        window.parent.postMessage(dataToSend, 'https://www.koosto.fr'); // Replace '*' with the actual origin of the parent for security
        window.parent.postMessage(dataToSend, 'https://editor.weweb.io');

        // Reset the counter for next use
        totalPointsInsideIsochrone = 0;
    }


