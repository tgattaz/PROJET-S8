 import React, { Component } from "react";
import "./App.css";
import Map from "./components/Map";
import neo4j from "neo4j-driver/lib/browser/neo4j-web";
import moment from "moment";

class App extends Component {
  constructor(props) {
    super(props);
    let focusedInput = null;

    this.state = {
      focusedInput,
      startDate: moment("2014-01-01"),
      endDate: moment("2018-01-01"),
      businesses: [],
      starsData: [],
      reviews: [{ day: "2018-01-01", value: 10 }],
      categoryData: [],
      selectedBusiness: false,
      mapCenter: {
        latitude: 43.295299,
        longitude: 5.373871,
        radius: 2,
        zoom: 13
      },
      startAddress: "",
      endAddress: "",
      pois: [],
      helpText: [
        "Déplace moi pour chercher des points d'interêts à visiter!",
        "Choisis deux places à relier par un itinéraire!"
      ],
      debugMode: {debugRouting: false, debugPolygons: false},
      regionPolygons: [],
      filterRegion: {},
      regionId: 0,
      routeMode: "shortestpath",
      viewMode: "streets-v9"
    };
    this.regionsNY = {
      // "manhattan": {"name": "Manhattan", id: 8398124},
      // "brooklyn": {"name": "Brooklyn", id: 369518},
      // "queens": {"name": "Queens", id: 369519},
      // "bronx": {"name": "The Bronx", id: 2552450},
      // "staten": {"name": "Staten Island", id: 962876}
    };
    this.regions = {
      // "corte_madera": {"name": "Corte Madera", id: 1260313},
      // "mill_valley": {"name": "Mill Valley", id: 112703},
      // "tiburon": {"name": "Tiburon", id: 2829690},
      // "belvedere": {"name": "Belvedere", id: 2829688},
      // "sausalito": {"name": "Sausalito", id: 2829689},
      // "san_francisco": {"name": "San Francisco", id: 111968},
      // "daly_city": {"name": "Daly City", id: 112271},
      // "brisbane": {"name": "Brisbane", id: 2834528},
      // "south_san_francisco": {"name": "South San Francisco", id: 2834558},
      // "hillsborough": {"name": "Hillsborough", id: 112285},
      // "san_mateo": {"name": "San Mateo", id: 2835017}
    };
    this.driver = neo4j.driver(
      process.env.REACT_APP_NEO4J_URI,
      neo4j.auth.basic(
        process.env.REACT_APP_NEO4J_USER,
        process.env.REACT_APP_NEO4J_PASSWORD
      ),
      { encrypted: false }
    );
    this.fetchBusinesses();
  }

  setStartAddress = startAddress => {
    this.setState({
      startAddress
    });
  };

  setEndAddress = endAddress => {
    this.setState({
      endAddress
    });
  };

  onDatesChange = ({ startDate, endDate }) => {
    if (startDate && endDate) {
      this.setState(
        {
          startDate,
          endDate
        },
        () => {
          this.fetchBusinesses();
        }
      );
    } else {
      this.setState({
        startDate,
        endDate
      });
    }
  };

  handleRouteChange = event => {
    const target = event.target;
    const value = target.value;
    this.setState(
      {
        routeMode: value
      },
      () => console.log(this.state.routeMode)
    );
  };

  handleViewChange = event => {
    const target = event.target;
    const value = target.value;
    this.setState(
      {
        viewMode: value
      },
      () => console.log(this.state.viewMode)
    );
  };

  handleDebugChange = event => {
    console.log(event);
    const target = event.target;
    var value = {};
    value[target.name] = target.type === "checkbox" ? target.checked : target.value;

    this.setState({
      debugMode: value
    });
  };

  handleRegionFilterChange = event => {
    const target = event.target;
    var value = {};
    value[target.name] = target.type === "checkbox" ? target.checked : target.value;
    var region = value[target.name] ? this.regions[target.name] : {};
    var regionId = region["id"] ? region["id"] : 0;

    this.setState({
      filterRegion: value,
      regionId: regionId
    }, () => {
      this.fetchBusinesses();
      this.fetchSelectedRegion();
    });
  };

  onFocusChange = focusedInput => this.setState({ focusedInput });

  businessSelected = b => {
    this.setState({
      selectedBusiness: b
    });
  };

  mapSearchPointChange = viewport => {
    this.setState({
      mapCenter: {
        ...this.state.mapCenter,
        latitude: viewport.latitude,
        longitude: viewport.longitude,
        zoom: viewport.zoom
      }
    });
  };

  // fetchStartMarker = () => {
  //   const { startAddress } = this.state;
  //   const session = this.driver.session();

  //   session
  //   .run(
  //     //`MATCH (a:Address) WHERE a.address CONTAINS toUpper($startAddress)
  //     // RETURN a.location.latitude AS latitude, a.location.longitude AS longitude, a.address AS address LIMIT 1;
  //     //`,
  //     `MATCH (p:PointOfInterest)

  //     `
  //     {
  //       startAddress
  //     }
  //   )
  //   .then(result => {
  //     console.log(result);
  //     const record = result.records[0];

  //     this.setState({
  //       startMarker: {
  //         latitude: record.get("latitude"),
  //         longitude: record.get("longitude"),
  //         address: record.get("address")
  //       }
  //     })
  //   })
  //   .catch(e => {
  //     console.log(e);
  //   })
  //   .finally(
  //     session.close()
  //   );
  // }

  // fetchRoute = () => {

  // }

  fetchBusinesses = () => {
    const { mapCenter } = this.state;
    const session = this.driver.session();

    let query;

    if (this.state.regionId) {
      query = `MATCH (r:OSMRelation) USING INDEX r:OSMRelation(relation_osm_id)
        WHERE r.relation_osm_id=$regionId AND exists(r.polygon)
      WITH r.polygon as polygon
      MATCH (p:PointOfInterest)
        WHERE distance(p.location, point({latitude: $lat, longitude:$lon})) < ($radius * 1000)
        AND amanzi.withinPolygon(p.location,polygon)
      RETURN p
      `;
    } else {
      query = `MATCH (p:PointOfInterest)
        WHERE distance(p.location, point({latitude: $lat, longitude:$lon})) < ($radius * 1000)
        RETURN p`;
        //-[:TAGS]->(o:OSMTags)
        // WITH p{ .*, amenity : o.amenity}
    }
    session
      .run(query, {
        lat: mapCenter.latitude,
        lon: mapCenter.longitude,
        radius: mapCenter.radius,
        regionId: this.state.regionId
      })
      .then(result => {
        //console.log(result);
        const pois = result.records.map(r => r.get("p"));
        console.log(pois);
        this.setState({ pois });
        session.close();
      })
      .catch(e => {
        // TODO: handle errors.
        console.log(e);
        session.close();
      });
  };

  fetchSelectedRegion = () => {
    if (this.state.regionId && this.state.debugMode.debugPolygons) {

      const session = this.driver.session();

      let query = `MATCH (r:OSMRelation) USING INDEX r:OSMRelation(relation_osm_id)
        WHERE r.relation_osm_id=$regionId AND exists(r.polygon)
      RETURN r.polygon as region
      `;

      session
        .run(query, {regionId: this.state.regionId})
        .then(result => {
          console.log(result);
          const regionPolygons = result.records.map(r => r.get("region"));
          this.setState({regionPolygons});
          session.close();
        })
        .catch(e => {
          // TODO: handle errors.
          console.log(e);
          session.close();
        });
    } else {
      this.setState({regionPolygons: []});
    }
  };

  componentDidUpdate = (prevProps, prevState) => {
    if (
      this.state.mapCenter.latitude !== prevState.mapCenter.latitude ||
      this.state.mapCenter.longitude !== prevState.mapCenter.longitude
    ) {
      this.fetchBusinesses();
    }
    if (
      this.state.selectedBusiness &&
      (!prevState.selectedBusiness ||
        this.state.selectedBusiness.id !== prevState.selectedBusiness.id ||
        false ||
        false)
    ) {
    }
  };

  handleSubmit = () => {};

  radiusChange = e => {
    this.setState(
      {
        mapCenter: {
          ...this.state.mapCenter,
          radius: Number(e.target.value)
        }
      },
      () => {
        this.fetchBusinesses();
      }
    );
  };

  dateChange = e => {
    if (e.target.id === "address-start") {
      this.setState(
        {
          startAddress: e.target.value
        },
        () => {
          this.fetchStartMarker();
          this.fetchRoute();
        }
      );
    } else if (e.target.id === "address-end") {
      this.setState(
        {
          endAddress: e.target.value
        },
        () => {
          this.fetchMarkers();
          this.fetchRoute();
        }
      );
    }
  };

  createRegionCheckboxes = () => {
    let rows = [];
    let keys = Object.keys(this.regions);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let region = this.regions[key];
      rows.push(
        <div key={key} className="row">
          <input
            type="checkbox"
            name={key}
            checked={this.state.filterRegion[key]}
            onChange={this.handleRegionFilterChange}
          />
          {region.name}
        </div>
      )
    }
    return rows
  };

  render() {
    return (
      <div id="app-wrapper">
        <div id="app-toolbar">
          <form action="" onSubmit={this.handleSubmit}>
            <div className="row tools">
              <div className="col-sm-2">
                <div className="tool radius">
                  <h5>Rayon de requête</h5>
                  <input
                    type="number"
                    id="radius-value"
                    className="form-control"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={this.state.mapCenter.radius}
                    onChange={this.radiusChange}
                  />
                  <select className="form-control" id="radius-suffix">
                    <option value="km">km</option>
                  </select>
                </div>
              </div>

              <div className="col-sm-2">
                <div className="tool coordinates">
                  <h5>Latitude</h5>
                  <input
                    type="number"
                    step="any"
                    id="coordinates-lat"
                    className="form-control"
                    placeholder="Latitude"
                    value={this.state.mapCenter.latitude}
                    onChange={() => true}
                  />
                </div>
              </div>

              <div className="col-sm-2">
                <div className="tool coordinates">
                  <h5>Longitude</h5>
                  <input
                    type="number"
                    step="any"
                    id="coordinates-lng"
                    className="form-control"
                    placeholder="Longitude"
                    value={this.state.mapCenter.longitude}
                    onChange={() => true}
                  />
                </div>
              </div>

              <div className="col-sm-2">
                <div className="tool timeframe">
                  <h5>Début POI</h5>
                  <input
                    type="text"
                    id="address-start"
                    className="form-control"
                    placeholder="Adresse de début"
                    value={this.state.startAddress}
                    onChange={this.dateChange}
                  />
                </div>
              </div>

              <div className="col-sm-2">
                <div className="tool timeframe">
                  <h5>Fin POI</h5>
                  <input
                    type="text"
                    id="address-end"
                    className="form-control"
                    placeholder="Adresse de fin"
                    value={this.state.endAddress}
                    onChange={this.dateChange}
                  />
                </div>
              </div>

              <div className="col-sm-2">
                <div className="tool" />
              </div>
            </div>
            <div className="row">
              <div className="col-sm-4" />
              <div className="col-sm-4" />
            </div>

            <div className="row">
              <div className="col-sm-4" />
              <div className="col-sm-4" />
            </div>
            <div className="row">
              <div className="col-sm-4" />
              <div className="col-sm-4" />
            </div>

          </form>
        </div>

        <div id='menu'>
                <h2>Affichage :</h2>
                <fieldset>
                <div>
                  <input
                    type="radio"
                    id="streets-v9"
                    name="rtoggle"
                    value="streets-v9"
                    checked={this.state.viewMode === "streets-v9"}
                    onChange={this.handleViewChange}
                  />
                  <label>Rues</label>
                </div>

                <div>
                  <input
                    type="radio"
                    id="light-v9"
                    name="rtoggle"
                    value="light-v9"
                    checked={this.state.viewMode === "light-v9"}
                    onChange={this.handleViewChange}
                  />
                  <label>Clair</label>
                </div>

                <div>
                  <input
                    type="radio"
                    id="dark-v9"
                    name="rtoggle"
                    value="dark-v9"
                    checked={this.state.viewMode === "dark-v9"}
                    onChange={this.handleViewChange}
                  />
                  <label>Sombre</label>
                </div>

                {/* <div>
                  <input
                    type="radio"
                    id="outdoors-v9"
                    name="rtoggle"
                    value="outdoors-v9"
                    checked={this.state.viewMode === "outdoors-v9"}
                    onChange={this.handleViewChange}
                  />
                  <label>Extérieurs</label>
                </div> */}

                <div>
                  <input
                    type="radio"
                    id="satellite-v9"
                    name="rtoggle"
                    value="satellite-v9"
                    checked={this.state.viewMode === "satellite-v9"}
                    onChange={this.handleViewChange}
                  />
                  <label>Satellite</label>
                </div>

                </fieldset>
              </div>

        <div id="app-left-side-panel">
          {/* <h2>Filter Region</h2> */}
          {/* {this.createRegionCheckboxes()} */}
          <h2>Algorithme</h2>
          <div className="row">
            <fieldset>
              <div>
                <input
                  type="radio"
                  id="shortestpath"
                  name="shortestpath"
                  value="shortestpath"
                  checked={this.state.routeMode === "shortestpath"}
                  onChange={this.handleRouteChange}
                />
                <label>Chemin le + court</label>
              </div>

              <div>
                <input
                  type="radio"
                  id="shortestpath-details"
                  name="shortestpath-details"
                  value="shortestpath-details"
                  checked={this.state.routeMode === "shortestpath-details"}
                  onChange={this.handleRouteChange}
                />
                <label>Chemin le + court détails</label>
              </div>

              <div>
                <input
                  type="radio"
                  id="dijkstra"
                  name="dijkstra"
                  value="dijkstra"
                  checked={this.state.routeMode === "dijkstra"}
                  onChange={this.handleRouteChange}
                />
                <label>Dijkstra</label>
              </div>

              <div>
                <input
                  type="radio"
                  id="dijkstra-details"
                  name="dijkstra-details"
                  value="dijkstra-details"
                  checked={this.state.routeMode === "dijkstra-details"}
                  onChange={this.handleRouteChange}
                />
                <label>Dijkstra détails</label>
              </div>

              <div>
                <input
                  type="radio"
                  id="astar"
                  name="astar"
                  value="astar"
                  checked={this.state.routeMode === "astar"}
                  onChange={this.handleRouteChange}
                />
                <label>Astar</label>
              </div>

              <div>
                <input
                  type="radio"
                  id="astar-details"
                  name="astar-details"
                  value="astar-details"
                  checked={this.state.routeMode === "astar-details"}
                  onChange={this.handleRouteChange}
                />
                <label>Astar détails</label>
              </div>

            </fieldset>
          </div>
          <h2>Options</h2>
          <div className="row">
            <input
              type="checkbox"
              name="debugRouting"
              checked={this.state.debugMode.debugRouting}
              onChange={this.handleDebugChange}
            />
            Graph de route
          </div>
          {/* <div className="row">
            <input
              type="checkbox"
              name="debugPolygons"
              checked={this.state.debugMode.debugPolygons}
              onChange={this.handleDebugChange}
            />
            Debug Polygons
          </div> */}
        </div>

        <div>
          <div id="app-maparea">
            <Map
              mapSearchPointChange={this.mapSearchPointChange}
              mapCenter={this.state.mapCenter}
              businesses={this.state.pois}
              regions={this.state.regionPolygons}
              businessSelected={this.businessSelected}
              selectedBusiness={this.state.selectedBusiness}
              startMarker={this.state.startMarker}
              setStartAddress={this.setStartAddress}
              setEndAddress={this.setEndAddress}
              driver={this.driver}
              debugMode={this.state.debugMode}
              routeMode={this.state.routeMode}
              viewMode={this.state.viewMode}
              helpText={this.state.helpText}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
