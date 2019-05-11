import React, { Component } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

var popup = new mapboxgl.Marker({ color: "black", zIndexOffset: 9999 });
var wait = new mapboxgl.Popup({closeOnClick: false});
var selected_start = new mapboxgl.Marker({ color: "green", zIndexOffset: 9999 });
var selected_end = new mapboxgl.Marker({ color: "red", zIndexOffset: 9999 });
var distance = new mapboxgl.Popup({closeOnClick: true});
var style;

class Map extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lng: props.mapCenter.longitude,
      lat: props.mapCenter.latitude,
      zoom: props.mapCenter.zoom
    };

    this.businessMarkers = [];
    this.mapLoaded = false;
    this.cestunpoint = false;

    this.pointcreated = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: []
          }
        }
      ]
    };

    this.geojson = {
      type: "FeatureCollection",
      features: []
    };

    this.debugIntersections = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: []
          }
        }
      ]
    };

    this.debugRoutable = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: []
          }
        }
      ]
    };

    this.debugIntersectionRoutes = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };

    this.debugPointsOfInterest = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };

    this.routeGeojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };

    this.regionPolygons = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };

    this.startGeojson = {
      type: "FeatureCollection",
      features: []
    };

    this.endGeojson = {
      type: "FeatureCollection",
      features: []
    };

    this.selectingStart = true;
    this.startAddress = this.props.startAddress;
    this.endAddress = this.props.endAddress;
  }

  createDebugIntersections = (lon, lat, radius) => {
    const session = this.props.driver.session();
    const query = `
    MATCH (p:Intersection)
    WHERE distance(p.location, point({latitude: $lat, longitude: $lon})) < $radius * 1000
    MATCH (p)-[r]->(p2:Intersection)
    RETURN COLLECT({startLat: p.location.latitude, startLon: p.location.longitude, endLat: p2.location.latitude, endLon: p2.location.longitude}) AS segments
    `;
    console.log(this);
    session
      .run(query, { lat, lon, radius })
      .then(result => {
        console.log(result);
        const route = result.records[0].get("segments");

        this.debugIntersections.features = route.map(e => {
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [e.startLon, e.startLat]
            }
          };
        });

        this.map.getSource("debugIntersections").setData(this.debugIntersections);

        this.debugIntersectionRoutes.features = route.map(e => {
          return {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [[e.startLon, e.startLat], [e.endLon, e.endLat]]
            }
          };
        });

        this.map.getSource("debugIntersectionRoutes").setData(this.debugIntersectionRoutes);
      })
      .catch(error => {
        console.log(error);
      })
      .finally(() => {
        session.close();
      });

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };
  };

  createDebugRoutable = (lon, lat, radius) => {
    const session = this.props.driver.session();
    const query = `
    MATCH (p:Routable)
    WHERE distance(p.location, point({latitude: $lat, longitude: $lon})) < $radius * 1000
    RETURN COLLECT([p.location.longitude, p.location.latitude]) AS coordinate
    `;
    console.log(this);
    session
      .run(query, { lat, lon, radius })
      .then(result => {
        console.log(result);
        const route = result.records[0].get("coordinate");

        this.debugRoutable.features = route.map(e => {
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: e
            }
          };
        });

        this.map.getSource("debugRoutable").setData(this.debugRoutable);
      })
      .catch(error => {
        console.log(error);
      })
      .finally(() => {
        session.close();
      });

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: []
          }
        }
      ]
    };
  };

  createDebugPointsOfInterest = (lon, lat, radius) => {
    const session = this.props.driver.session();
    const query = `
    MATCH (p:PointOfInterest)
    WHERE distance(p.location, point({latitude: $lat, longitude: $lon})) < $radius * 1000
    MATCH (p)-[r:ROUTE]->(p2:Routable)
    RETURN COLLECT({startLat: p.location.latitude, startLon: p.location.longitude, endLat: p2.location.latitude, endLon: p2.location.longitude}) AS segments
    `;
    console.log(this);
    session
      .run(query, { lat, lon, radius })
      .then(result => {
        console.log(result);
        const route = result.records[0].get("segments");

        this.debugPointsOfInterest.features = route.map(e => {
          return {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [[e.startLon, e.startLat], [e.endLon, e.endLat]]
            }
          };
        });

        this.map.getSource("debugPointsOfInterest").setData(this.debugPointsOfInterest);
      })
      .catch(error => {
        console.log(error);
      })
      .finally(() => {
        session.close();
      });

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: []
          }
        }
      ]
    };
  };

  // https://stackoverflow.com/questions/37599561/drawing-a-circle-with-the-radius-in-miles-meters-with-mapbox-gl-js
  createGeoJSONCircle = (center, radiusInKm, points) => {
    if (!points) points = 64;

    var coords = {
      latitude: center[1],
      longitude: center[0]
    };

    var km = radiusInKm;

    var ret = [];
    var distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
    var distanceY = km / 110.574;

    var theta, x, y;
    for (var i = 0; i < points; i++) {
      theta = (i / points) * (2 * Math.PI);
      x = distanceX * Math.cos(theta);
      y = distanceY * Math.sin(theta);

      ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);

    return {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [ret]
            }
          }
        ]
      }
    };
  };

  geoJSONForPOIs = pois => {
    return pois.map(poi => {
      const p = poi.properties;
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [p.location.x, p.location.y]
        },
        properties: {
          title: "",
          id: p.node_osm_id.toString(),
          name: p.name,
          amenity: p.amenity,
          icon: "monument",
          "marker-color": "#fc4353"
        }
      };
    });

    // layout: {
    //   "icon-image": "{icon}-15",
    //   "text-field": "{title}",
    //   "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    //   "text-offset": [0, 0.6],
    //   "text-anchor": "top"
    // }
  };

  geoJSONForRegions = regionPolygons => {
    return regionPolygons.map(polygon => {
      let coordinates = polygon.map(point => [point.x, point.y]);
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coordinates
        }
      };
    });
  };

  businessPopupHTML = business => {
    return `<ul>
    <li>
      <strong>Name: </strong> ${business.name}
    </li>
    <li>
      <strong>Address: </strong> ${business.address}
    </li>
    <li>
      <strong>City: </strong> ${business.city}
    </li>
  </ul>`;
  };

  setStartMarker() {
    const { startMarker } = this.props;

    if (startMarker) {
      new mapboxgl.Marker()
        .setLngLat([startMarker.longitude, startMarker.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(startMarker.address)
        )
        .addTo(this.map);
    }
  }

  setBusinessMarkers() {
    const { businesses } = this.props;
    this.geojson.features = this.geoJSONForPOIs(businesses);
    this.map.getSource("geojson").setData(this.geojson);
  }

  setRegionPolygons() {
    const { regions } = this.props;
    this.regionPolygons.features = this.geoJSONForRegions(regions);
    this.map.getSource("regionPolygons").setData(this.regionPolygons);
  }

  fetchRoute() {
    if(this.startPOI && this.endPOI) {
      this.fetchRouteFor(this.startPOI, this.endPOI);
    }
  }

  fetchRouteFor(startPOI, endPOI) {
    console.log("1) "+startPOI);
    console.log("2) "+endPOI);
    const session = this.props.driver.session();

    let query;

    if (this.props.routeMode === "shortestpath") {
      this.map.setPaintProperty("lines","line-color","purple");
      query = `
    MATCH (a:OSMNode) WHERE a.node_osm_id = toInteger($startPOI)
    MATCH (b:OSMNode) WHERE b.node_osm_id = toInteger($endPOI)
    MATCH p=shortestPath((a)-[:ROUTE*..200]-(b))
    UNWIND nodes(p) AS n
    WITH n, extract(dist IN relationships(p)| dist.distance) AS extracted
    RETURN COLLECT([n.location.longitude,n.location.latitude]) AS route,apoc.coll.sum(extracted)
    `;
    } else if (this.props.routeMode === "dijkstra") {
      this.map.setPaintProperty("lines","line-color","red");
      query = `
      MATCH (a:OSMNode) WHERE a.node_osm_id = toInteger($startPOI)
      MATCH (b:OSMNode) WHERE b.node_osm_id = toInteger($endPOI)
      CALL apoc.algo.dijkstra(a,b,'ROUTE', 'distance') YIELD path, weight
      UNWIND nodes(path) AS n
      RETURN COLLECT([n.location.longitude, n.location.latitude]) AS route,weight
      `

    } else if (this.props.routeMode === "astar") {
      this.map.setPaintProperty("lines","line-color","yellow");
      query = `
      MATCH (a:OSMNode) WHERE a.node_osm_id = toInteger($startPOI)
      MATCH (b:OSMNode) WHERE b.node_osm_id = toInteger($endPOI)
      CALL apoc.algo.aStar(a, b, 'ROUTE', 'distance', 'lat', 'lon') YIELD path, weight
      UNWIND nodes(path) AS n
      RETURN COLLECT([n.location.longitude, n.location.latitude]) AS route,weight
      `
    } else {
      // default query, use if
      query = `
    MATCH (a:OSMNode) WHERE a.node_osm_id = toInteger($startPOI)
    MATCH (b:OSMNode) WHERE b.node_osm_id = toInteger($endPOI)
    MATCH p=shortestPath((a)-[:ROUTE*..200]-(b))
    UNWIND nodes(p) AS n
    RETURN COLLECT([n.location.longitude,n.location.latitude]) AS route
    `;
    }
    
    console.log(this);
    console.log(query);
    session
      .run(query, {
        startPOI: startPOI,
        endPOI: endPOI,
        routeRadius: this.routeRadius,
        routeCenterLat: this.routeViewport.latitude,
        routeCenterLon: this.routeViewport.longitude
      })
      .then(result => {
        console.log(result);
        var moitie = result.records[0].get("route")[Math.round(result.records[0].get("route").length/2)];
        if(this.props.routeMode === "shortestpath"){
          var somme = this.routeGeojson.features[0].geometry.coordinates = result.records[0].get("apoc.coll.sum(extracted)");
          if(somme>=1000){
            somme = (somme/1000).toFixed(2);
            distance.setLngLat([moitie[0], moitie[1]]).setHTML('<h2>Distance : '+somme+'km </h2>').addTo(this.map);
          }else{
            somme = Math.round(somme); 
            distance.setLngLat([moitie[0], moitie[1]]).setHTML('<h2>Distance : '+somme+'m </h2>').addTo(this.map);
          }
        }else{
          var somme = this.routeGeojson.features[0].geometry.coordinates = result.records[0].get("weight");
          if(somme>=1000){
            somme = (somme/1000).toFixed(2);
            distance.setLngLat([moitie[0], moitie[1]]).setHTML('<h2>Distance : '+somme+'km </h2>').addTo(this.map);
          }else{
            somme = Math.round(somme); 
            distance.setLngLat([moitie[0], moitie[1]]).setHTML('<h2>Distance : '+somme+'m </h2>').addTo(this.map);
          }
        }
        this.routeGeojson.features[0].geometry.coordinates = result.records[0].get("route");
        this.map.getSource("routeGeojson").setData(this.routeGeojson);
      })
      .catch(error => {
        console.log(error);
      })
      .finally(() => {
        session.close();
      });
  }

  componentDidUpdate() {

    this.setStartMarker();

    if (this.mapLoaded) {
      this.map
        .getSource("polygon")
        .setData(
          this.createGeoJSONCircle(
            [this.props.mapCenter.longitude, this.props.mapCenter.latitude],
            this.props.mapCenter.radius
          ).data
        );

      if(style!==this.props.viewMode){
        this.componentDidMount();
      }else{
        this.setRegionPolygons();
        this.setBusinessMarkers();
        this.fetchRoute();
      };
    }
  }

  componentDidMount() {
    style = this.props.viewMode;
    const { lng, lat, zoom } = this.state;

    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: "mapbox://styles/mapbox/"+this.props.viewMode,
      center: [lng, lat],
      zoom
    });

    this.map.on("load", () => {
      this.mapLoaded = true;
      this.map.doubleClickZoom.disable();
      this.map.addSource(
        "polygon",
        this.createGeoJSONCircle([lng, lat], this.props.mapCenter.radius)
      );
      this.map.addLayer({
        id: "polygon",
        type: "fill",
        source: "polygon",
        layout: {},
        paint: {
          "fill-color": "black",
          "fill-opacity": 0.2
        }
      });

      this.map.addSource("geojson", {
        type: "geojson",
        data: this.geojson
      });

      this.map.addSource("routeGeojson", {
        type: "geojson",
        data: this.routeGeojson
      });
      

      this.map.addSource("debugIntersectionRoutes", {
        type: "geojson",
        data: this.debugIntersectionRoutes
      });

      this.map.addSource("debugIntersections", {
        type: "geojson",
        data: this.debugIntersections
      });

      this.map.addSource("debugRoutable", {
        type: "geojson",
        data: this.debugRoutable
      });

      this.map.addSource("debugPointsOfInterest", {
        type: "geojson",
        data: this.debugPointsOfInterest
      });

      this.map.addSource("regionPolygons", {
        type: "geojson",
        data: this.regionPolygons
      });

      this.map.addSource("startGeojson", {
        type: "geojson",
        data: this.startGeojson
      });

      this.map.addSource("endGeojson", {
        type: "geojson",
        data: this.endGeojson
      });

      this.map.addLayer({
        id: "debugPointsOfInterest",
        type: "line",
        source: "debugPointsOfInterest",
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#0f8",
          "line-width": 5
        },
        filter: ["in", "$type", "LineString"]
      });

      this.map.addLayer({
        id: "debugIntersectionRoutes",
        type: "line",
        source: "debugIntersectionRoutes",
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#08f",
          "line-width": 5
        },
        filter: ["in", "$type", "LineString"]
      });

      this.map.addLayer({
        id: "debugRoutable",
        type: "circle",
        source: "debugRoutable",
        paint: {
          "circle-radius": 8,
          "circle-color": "#199"
        }
      });

      this.map.addLayer({
        id: "debugIntersections",
        type: "circle",
        source: "debugIntersections",
        paint: {
          "circle-radius": 5,
          "circle-color": "#044"
        }
      });

      this.map.addLayer({
        id: "regionPolygons",
        type: "line",
        source: "regionPolygons",
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#038",
          "line-width": 5
        },
        filter: ["in", "$type", "LineString"]
      });

      // this.map.addLayer({
      //   id: "start",
      //   type: "circle",
      //   source: "startGeojson",
      //   paint: {
      //     "circle-radius": 12,
      //     "circle-color": "green"
      //   }
      // });

      // this.map.addLayer({
      //   id: "end",
      //   type: "circle",
      //   source: "endGeojson",
      //   paint: {
      //     "circle-radius": 12,
      //     "circle-color": "red"
      //   }
      // });

      this.map.addSource("POIcreate", {
        type: "geojson",
        data: this.pointcreated
      });

      this.map.addLayer({
        id: "pointcreate",
        type: "circle",
        source: "POIcreate",
        paint: {
          "circle-radius": 5,
          "circle-color": "#000"
        },
        filter: ["in", "$type", "Point"]
      });

      this.map.addLayer({
        "id": "points",
        "type": "symbol",
        source: "geojson",
        "layout": {
        "icon-image": "{amenity}-15"
        }
        });
        
      
      this.map.addLayer({
        id: "lines",
        type: "line",
        source: "routeGeojson",
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "purple",
          "line-width": 5,
          "line-opacity": 0.6
        },
        filter: ["in", "$type", "LineString"]
      });

      this.map.on("mousemove", e => {
        
        var features = this.map.queryRenderedFeatures(e.point, {
          layers: ["points"]
        });
        
        if(features.length !== 0){
          popup.setLngLat(features[0].geometry.coordinates)
          .addTo(this.map)
          .setPopup(
            new mapboxgl.Popup().setHTML(`${features[0].properties.name}, ${features[0].properties.amenity}`)
          )
          .setDraggable(true)
          .on("dragend", onDragEnd)
          .addTo(this.map)
          .togglePopup();
          } else{
            popup.remove();
          };

       // UI indicator for clicking/hovering a point on the map
        this.map.getCanvas().style.cursor = features.length
          ? "pointer"
          : "crosshair";
      });

      this.map.on("dblclick", e => {
        this.pointcreated.features[0].geometry.coordinates = [e.lngLat.lng,e.lngLat.lat];
        this.map.getSource("POIcreate").setData(this.pointcreated);
        wait.setLngLat([e.lngLat.lng,e.lngLat.lat])
        .setHTML('<h1>En attente de liaison au graph de route</h1>')
        .addTo(this.map);
        
        const session = this.props.driver.session();

        let query;
    
        query = `
        MATCH (p1)-[:ROUTE]-()
        WITH min(distance(p1.location, point({latitude: $latPOI, longitude: $lngPOI}))) AS shortest_distance
        MATCH (p2:OSMNode)-[:ROUTE]-()
        WHERE distance(p2.location, point({latitude: $latPOI, longitude: $lngPOI}))=shortest_distance
        RETURN DISTINCT p2
        `;
        
        console.log(this);
        console.log(query);
    
        session
          .run(query, {
            latPOI: e.lngLat.lat,
            lngPOI: e.lngLat.lng
          })
          .then(result => {
            this.pointcreated.features[0].geometry.coordinates = [result.records[0]._fields[0].properties.lon,result.records[0]._fields[0].properties.lat];
            this.map.getSource("POIcreate").setData(this.pointcreated);
            wait.remove();
            console.log(result.records[0]._fields[0].properties.lon,result.records[0]._fields[0].properties.node_osm_id);
   
            selected_start.setLngLat([result.records[0]._fields[0].properties.lon,result.records[0]._fields[0].properties.lat])
            .addTo(this.map);
            this.pointcreated = {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: []
                  }
                }
              ]
            };
            this.map.getSource("POIcreate").setData(this.pointcreated);
            this.startAddress = 'Adresse perso';
            this.startPOI = result.records[0]._fields[0].properties.node_osm_id;
            this.selectingStart = false;
            this.routeGeojson.features[0].geometry.coordinates = [];
            this.startGeojson.features = [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [result.records[0]._fields[0].properties.lon,result.records[0]._fields[0].properties.lat]
                },
                properties: {
                  title: "",
                  name: 'Adresse perso',
                  id: 'Adresse perso',
                  icon: "monument",
                  "marker-color": "#fc4353"
                }
              }
            ];
            this.map.getSource("startGeojson").setData(this.startGeojson);
            this.map.getSource("routeGeojson").setData(this.routeGeojson);
            this.props.setStartAddress('Adresse perso');
            })
          .catch(error => {
            console.log(error);
          })
          .finally(() => {
            session.close();
          });
        });

      this.map.on("click", "points", e => {
        console.log(e);
        console.log("Have " + e.features.length + " features");
        console.log(e.features[0]);
        const feature = e.features[0];
        console.log(feature.properties.id);
        const address = feature.properties.name;
        const name = feature.properties.name;
        const coordinates = feature.geometry.coordinates;
        console.log("NAME AND ADDRESS:");
        console.log(name);
        console.log(address);
        console.log("Location:");
        console.log(coordinates);


        if (this.selectingStart) {
          selected_start.setLngLat([coordinates[0], coordinates[1]])
          .addTo(this.map);
          this.startAddress = name;
          this.startPOI = feature.properties.id;
          this.selectingStart = false;
          this.routeGeojson.features[0].geometry.coordinates = [];
          this.startGeojson.features = [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: coordinates
              },
              properties: {
                title: "",
                name: name,
                id: name,
                icon: "monument",
                "marker-color": "#fc4353"
              }
            }
          ];
          this.map.getSource("startGeojson").setData(this.startGeojson);
          this.map.getSource("routeGeojson").setData(this.routeGeojson);
          this.props.setStartAddress(name);
        } else {
          selected_end.setLngLat([coordinates[0], coordinates[1]])
          .addTo(this.map);
          this.endAddress = name;
          this.endPOI = feature.properties.id;
          this.endGeojson.features = [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: coordinates
              },
              properties: {
                title: "",
                name: name,
                id: name,
                icon: "monument",
                "marker-color": "#fc4353"
              }
            }
          ];

          this.selectingStart = true;
          this.map.getSource("endGeojson").setData(this.endGeojson);
          this.props.setEndAddress(name);
          this.fetchRoute();
        }
      });
    });

    const helpText = i => {
      if (i < this.props.helpText.length) {
        return "<div id='popup'>" + this.props.helpText[i] + "</div>";
      } else {
        return null;
      }
    };

    const onDragEnd = e => {
      if(e.target.getPopup().isOpen()) {
        if (!e.target['helpLevel']) {
          e.target['helpLevel'] = 1;
        }
        const text = helpText(e.target.helpLevel);
        if (text) {
          e.target.getPopup().setHTML(text);
          e.target.helpLevel++;
        } else {
          e.target.togglePopup();
        }
      }
      var lngLat = e.target.getLngLat();

      const viewport = {
        latitude: lngLat.lat,
        longitude: lngLat.lng,
        zoom: this.map.getZoom()
      };

      this.routeViewport = viewport;
      this.routeRadius = this.props.mapCenter.radius * 1000;

      this.props.mapSearchPointChange(viewport);

      this.map
        .getSource("polygon")
        .setData(
          this.createGeoJSONCircle(
            [lngLat.lng, lngLat.lat],
            this.props.mapCenter.radius
          ).data
        );

      if (this.props.debugMode.debugRouting) {
        this.createDebugRoutable(
          lngLat.lng,
          lngLat.lat,
          this.props.mapCenter.radius
        );
        this.createDebugIntersections(
          lngLat.lng,
          lngLat.lat,
          this.props.mapCenter.radius
        );
        this.createDebugPointsOfInterest(
          lngLat.lng,
          lngLat.lat,
          this.props.mapCenter.radius
        );
      } else {
        this.debugRoutable.features = [];
        this.map.getSource("debugRoutable").setData(this.debugRoutable);
        this.debugIntersections.features = [];
        this.map.getSource("debugIntersections").setData(this.debugIntersections);
        this.debugIntersectionRoutes.features = [];
        this.map.getSource("debugIntersectionRoutes").setData(this.debugIntersectionRoutes);
        this.debugPointsOfInterest.features = [];
        this.map.getSource("debugPointsOfInterest").setData(this.debugPointsOfInterest);
      }
    };

    new mapboxgl.Marker({ color: "blue", zIndexOffset: 9999 })
      .setLngLat([lng, lat])
      .addTo(this.map)
      .setPopup(
        new mapboxgl.Popup().setHTML(helpText(0))
      )
      .setDraggable(true)
      .on("dragend", onDragEnd)
      .addTo(this.map)
      .togglePopup();

    this.map.on("move", () => {
      const { lng, lat } = this.map.getCenter();

      this.setState({
        lng: lng,
        lat: lat,
        zoom: this.map.getZoom().toFixed(2)
      });
    });

    //this.setBusinessMarkers();
  }

  render() {
    return (
      <div>
        <div
          ref={el => (this.mapContainer = el)}
          className="absolute top right left bottom"
        />
        <div id="distance" className="distance-container" />
      </div>
    );
  }
}

export default Map;
