// AccesToken
mapboxgl.accessToken =
  "pk.eyJ1IjoiYW5hZWxkZWxvcm1lIiwiYSI6ImNscTI1eHI1bjAwcHQyam5zNXEzbG9sNDUifQ.OplU3wX4w6Thg2ZKomWZ9A";

// Configuration de la carte
var map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/satellite-v9", // fond de carte
  center: [16.29, 1.97],
  zoom: 4,
});

function addAdditionalSourceAndLayer() {
  console.log(map.getStyle(), "map.getStyle()");
  console.log(map.getStyle().layers); // Check if 'concessions' layer is present
  console.log(map.getStyle().sources);
  map.addSource("tileset_data", {
    type: "vector",
    url: "mapbox://anaeldelorme.7irw0cc8",
  });

  map.addLayer({
    source: "tileset_data",
    id: "concessions",
    type: "fill",
    "source-layer": "data_dttm_atena_light-58sx1e",
    paint: {
      "fill-color": [
        "match",
        ["get", "features"],
        "Concédée",
        "#fc5d00",
        "Supprimée",
        "#f60700",
        "Annulée",
        "#dbdbdc",
        "Vacante",
        "#27a658",
        "features inconnu",
        "#f60700",
        "#f60700" /* Default color if no match is found */,
      ],

      "fill-opacity": 0.8,
    },
  });

  // affichage des clusters de points
  map.addSource("point_data", {
    type: "geojson",
    data: "./data_dttm_atena_point_light.geojson",
    cluster: true,
    clusterMaxZoom: 14, // Max zoom to cluster points on
    clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
  });

  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "point_data",
    filter: ["has", "point_count"],
    maxzoom: 10,
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#51bbd6",
        500,
        "#f1f075",
        1000,
        "#8dde73",
      ],
      "circle-radius": ["step", ["get", "point_count"], 20, 500, 30, 1000, 40],
    },
  });

  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "point_data",
    filter: ["has", "point_count"],
    maxzoom: 10,
    layout: {
      "text-field": ["get", "point_count"],
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 12,
    },
  });

  map.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: "point_data",
    maxzoom: 10,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": "#11b4da",
      "circle-radius": 8,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#fff",
    },
  });
}

map.on("load", function () {
  addAdditionalSourceAndLayer();
});

const viewToggleSwitch = document.getElementById("viewToggleSwitch");

viewToggleSwitch.addEventListener("change", function () {
  if (this.checked) {
    // Si la case à cocher est cochée, utilisez le style satellite
    map.setStyle("mapbox://styles/mapbox/satellite-v9");
  } else {
    // Sinon, utilisez le style des rues
    map.setStyle("mapbox://styles/mapbox/light-v11");
  }
  map.on("style.load", function () {
    addAdditionalSourceAndLayer();
  });
});
// Ajout d'éléments de navigation
var nav = new mapboxgl.NavigationControl();
map.addControl(nav, "top-left");

map.addControl(
  new mapboxgl.ScaleControl({
    maxWidth: 120,
    unit: "metric",
  })
);
var filteredData;

// Intéractivité avec les données
var popup = new mapboxgl.Popup({
  closeButton: true,
  closeOnClick: true,
  className: "popupConcession",
});

map.on("mousemove", function (e) {
  var clusterFeatures = map.queryRenderedFeatures(e.point, {
    layers: ["clusters"],
  });
  var concessionFeatures = map.queryRenderedFeatures(e.point, {
    layers: ["concessions"],
  });

  if (clusterFeatures.length) {
    map.getCanvas().style.cursor = "pointer";
  } else if (concessionFeatures.length) {
    map.getCanvas().style.cursor = "pointer";
  } else {
    map.getCanvas().style.cursor = "";
  }
});

map.on("click", function (e) {
  var concessionFeatures = map.queryRenderedFeatures(e.point, {
    layers: ["concessions"],
  });
  console.log(concessionFeatures, "concessionFeatures");
  var clusterFeatures = map.queryRenderedFeatures(e.point, {
    layers: ["clusters"],
  });
  console.log(clusterFeatures, "clusterFeatures");
  // Gestion des clics sur la couche 'concessions'
  if (concessionFeatures.length) {
    var feature = concessionFeatures[0];
    var coordinates =
      feature.geometry.type === "Point"
        ? feature.geometry.coordinates
        : e.lngLat;

    return;
  }
  function coordinatesEqual(coord1, coord2) {
    return coord1[0] === coord2[0] && coord1[1] === coord2[1];
  }
  // Gestion des clics sur la couche 'clusters'
  if (clusterFeatures.length) {
    console.log(clusterFeatures, "clusterFeatures/////////");
    const clusterId = clusterFeatures[0].properties.cluster_id;
    map
      .getSource("point_data")
      .getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;

        map.easeTo({
          center: clusterFeatures[0].geometry.coordinates,
          zoom: zoom,
        });

        // Move the queryRenderedFeatures outside the callback
        // This ensures it is executed after the zooming animation completes
        let features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        console.log(features, "features@@@@@@@@@@");

        // Remove existing unclustered point markers if they exist
        if (map.getSource("unclustered-point-marker")) {
          map.removeLayer("unclustered-point-marker");
          map.removeSource("unclustered-point-marker");
        }

        // Add markers for each unclustered point
        map.addSource("unclustered-point-marker", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: features.map((feature) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: feature.geometry.coordinates,
              },
            })),
          },
        });

        map.addLayer({
          id: "unclustered-point-marker",
          type: "circle",
          source: "unclustered-point-marker",
          paint: {
            "circle-color": "#11b4da",
            "circle-radius": 8,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });
        function filterFeaturesByCoordinates(features, coordinates) {
          const unclusteredFeatures = features.filter(
            (feature) => !feature.properties.cluster
          );

          const clusteredFeatures = features.filter(
            (feature) => feature.properties.cluster
          );

          const matchingUnclustered = unclusteredFeatures.filter((feature) =>
            coordinatesEqual(feature.geometry.coordinates, coordinates)
          );

          if (matchingUnclustered.length > 0) {
            return matchingUnclustered;
          }
          // handle clustered features
          const matchingClustered = clusteredFeatures.filter((feature) =>
            coordinatesEqual(feature.geometry.coordinates, coordinates)
          );

          if (matchingClustered.length > 0) {
            const clusterId = matchingClustered[0].properties.cluster_id;
            const clusterSource = map.getSource("point_data");
            const clusterLeaves = clusterSource.getClusterLeaves(
              clusterId,
              100,
              0
            );
            return clusterLeaves;
          }

          return [];
        }
        map.on("click", "unclustered-point-marker", function (e) {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["unclustered-point-marker"],
          });
          const feature = features[0];
          const coordinates = feature.geometry.coordinates;
          const filteredFeatures = filterFeaturesByCoordinates(
            originalData.features,
            coordinates
          );
          console.log("Clicked Coordinates:", coordinates);
          console.log(filteredFeatures, "filtered Features+++++++");
          // const arrayID = filteredFeatures[0].properties.id;
          // console.log(arrayID, "arrayID");

          // const feature = e.features[0];
          // console.log(feature, "feature");
          // const checkboxValue = feature.properties.features[0]; // Assuming 'features' is an array

          // Add your logic to display additional information and show/hide elements
          // addPopup(e);
          // $(".locations-map_wrapper").addClass("is--show");

          // if ($(".locations-map_item.is--show").length) {
          //   $(".locations-map_item").removeClass("is--show");
          // }

          // $(".locations-map_item").eq(arrayID).addClass("is--show");
        });
      });

    return;
  }
});

map.on("click", "unclustered-point", function (e) {
  var coordinates = e.features[0].geometry.coordinates.slice();
  var description = e.features[0].properties.description;
  console.log(e.features[0].properties, "e.features[0].properties");
  // Ensure that if the map is zoomed out such that multiple
  // copies of the feature are visible, the popup appears
  // over the copy being pointed to
  while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
  }

  new mapboxgl.Popup().setLngLat(coordinates).setHTML(description).addTo(map);
});
var featuresCheckboxes = [];
var originalData;
// Load GeoJSON data
fetch("./data_dttm_atena_point_light.geojson")
  .then((response) => response.json())
  .then((data) => {
    originalData = data;

    // Ensure the map is fully loaded before manipulating it
    map.on("load", function () {
      createCheckboxes(originalData); // Call createCheckboxes with the loaded data

      featuresCheckboxes = Array.from(
        document.querySelectorAll('#checkboxContainer input[type="checkbox"]')
      );

      updateFilters(); // Apply initial filters
    });
  })
  .catch((error) => console.error("Error fetching data:", error));

function updateFilters() {
  if (!originalData) {
    console.error("Original data is not yet loaded.");
    return;
  }

  var filters = ["any"];

  // Iterate over checkboxes and add filters for checked ones
  featuresCheckboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      filters.push(["in", checkbox.value, ["get", "features"]]);
    }
  });

  console.log(filters, "filters");

  // map.setFilter("concessions", filters);

  // Filter the GeoJSON data based on the combined filter
  filteredData = {
    type: "FeatureCollection",
    crs: originalData.crs,
    features: originalData.features.filter((item) => {
      if (item.properties && item.properties.features) {
        const shouldInclude = featuresCheckboxes.some(
          (checkbox) =>
            checkbox.checked &&
            item.properties.features.includes(checkbox.value)
        );

        if (shouldInclude) {
          return true;
        }
      }
      return false;
    }),
  };

  console.log(filteredData, "filteredData");

  // Update the clustering source with the filtered data
  map.getSource("point_data").setData(filteredData);
}

map.on("error", function (err) {
  console.log("Mapbox Error:", err.error);
});
function getUniqueValues(geojson, property) {
  console.log(geojson, "geojson");
  const uniqueValues = new Set();
  geojson.features.forEach((feature) => {
    if (feature.properties && feature.properties[property]) {
      const propertyValue = feature.properties[property];
      if (Array.isArray(propertyValue)) {
        // If the property value is an array, add each item separately
        propertyValue.forEach((item) => uniqueValues.add(item));
      } else {
        uniqueValues.add(propertyValue);
      }
    }
  });
  return Array.from(uniqueValues);
}

// Function to dynamically create checkboxes
function createCheckboxes(data) {
  console.log(data, "data");

  const featureValues = getUniqueValues(data, "features");
  const checkboxContainer = document.getElementById("checkboxContainer");

  featureValues.forEach((feature, index) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = feature;
    checkbox.value = feature;
    checkbox.checked = true; // You can set the default checked state if needed

    const label = document.createElement("label");
    label.htmlFor = feature;
    label.appendChild(document.createTextNode(feature));

    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);
    checkboxContainer.appendChild(document.createElement("br"));

    // Add event listener to call updateFilters on checkbox change
    checkbox.addEventListener("change", updateFilters);
  });
}

// Call the function to create checkboxes
createCheckboxes(originalData);

// Fonction pour obtenir les coordonnées en fonction de la région sélectionnée
function getCoordinatesForRegion(region) {
  switch (region) {
    case "Normandie":
      return [-0.7236, 49.2473];
    case "Bnord":
      return [-3.026, 48.802];
    case "Bsud":
      return [-3.5046, 47.7016];
    case "Pdl":
      return [-2.472, 46.975];
    case "Charente":
      return [-1.2543, 46.0857];
    case "Arcachon":
      return [-1.1884, 44.5649];
    case "Med":
      return [5.841, 43.139];
    default:
      return [2.72799, 46.967532];
  }
}

// Fonction pour obtenir les zooms en fonction de la région sélectionnée
function getZoomForRegion(region) {
  switch (region) {
    case "Normandie":
      return 8.5;
    case "Bnord":
      return 8.5;
    case "Bsud":
      return 8.2;
    case "Pdl":
      return 9;
    case "Charente":
      return 10;
    case "Arcachon":
      return 10;
    case "Med":
      return 7.5;
    default:
      return 8;
  }
}

// Gestion des erreurs
map.on("error", function (err) {
  console.log("Mapbox Error:", err.error);
});
