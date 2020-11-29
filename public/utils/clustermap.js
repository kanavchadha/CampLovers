mapboxgl.accessToken = mapboxToken;
var cmap = new mapboxgl.Map({
    container: 'cl_map',
    style: 'mapbox://styles/mapbox/light-v10',
    center: [78.9629,20.5937],
    zoom: 3,
});

cmap.on('load', function () {
    // Add a new source from our GeoJSON data and
    // set the 'cluster' option to true. GL-JS will
    // add the point_count property to your source data.
    cmap.addSource('campgrounds', {
        type: 'geojson',
        // Point to GeoJSON data. This example visualizes all M1.0+ campgrounds
        // from 12/22/15 to 1/21/16 as logged by USGS' Earthquake hazards program.
        data: 'https://camplovers.herokuapp.com/campgrounds/geojson-data',
        cluster: true,
        clusterMaxZoom: 14, // Max zoom to cluster points on
        clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
    });

    cmap.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'campgrounds',
        filter: ['has', 'point_count'],
        paint: {
            // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
            // with three steps to implement three types of circles:
            //   * Blue, 20px circles when point count is less than 100
            //   * Yellow, 30px circles when point count is between 100 and 750
            //   * Pink, 40px circles when point count is greater than or equal to 750
            'circle-color': [
                'step',
                ['get', 'point_count'],
                '#51bbd6',
                100,
                '#f1f075',
                750,
                '#f28cb1',
            ],
            'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
        },
    });

    cmap.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'campgrounds',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
        },
    });

    cmap.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'campgrounds',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': '#fca903',
            'circle-radius': 6,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#a1bad6',
        },
    });

    // inspect a cluster on click
    cmap.on('click', 'clusters', function (e) {
        var features = cmap.queryRenderedFeatures(e.point, {
            layers: ['clusters'],
        });
        var clusterId = features[0].properties.cluster_id;
        cmap.getSource('campgrounds').getClusterExpansionZoom(clusterId, function (err, zoom) {
            if (err) return;

            cmap.easeTo({
                center: features[0].geometry.coordinates,
                zoom: zoom,
            });
        });
    });

    // When a click event occurs on a feature in
    // the unclustered-point layer, open a popup at
    // the location of the feature, with
    // description HTML from its properties.
    cmap.on('click', 'unclustered-point', function (e) {
        var coordinates = e.features[0].geometry.coordinates.slice();
	    var id = e.features[0].properties.id;
        var name = e.features[0].properties.name;
		var location = e.features[0].properties.location;

        // Ensure that if the map is zoomed out such that
        // multiple copies of the feature are visible, the
        // popup appears over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`<h5>Name: <a href="/campage/${id}"> ${name} :> </a> </h5> Location: ${location}`)
            .addTo(cmap);
    });

    cmap.on('mouseenter', 'clusters', function () {
        cmap.getCanvas().style.cursor = 'pointer';
    });
    cmap.on('mouseleave', 'clusters', function () {
        cmap.getCanvas().style.cursor = '';
    });
});