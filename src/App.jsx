import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Loader } from "@googlemaps/js-api-loader";
import './App.css'

const supabase = createClient(
  "PROJECT_URL",
  "ANON_KEY"
);

const timeOptions = [
  { label: "1 min", value: 1 * 60 * 1000 },
  { label: "15 min", value: 15 * 60 * 1000 },
  { label: "1 hr", value: 60 * 60 * 1000 },
  { label: "12 hr", value: 12 * 60 * 60 * 1000 },
  { label: "24 hr", value: 24 * 60 * 60 * 1000 },
];

function App() {
  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeOptions[1].value); // Default to 15 min

  useEffect(() => {
    // Load selected time range from localStorage (if exists)
    const storedInterval = localStorage.getItem("timeRange");
    if (storedInterval) {
      setSelectedTimeRange(Number(storedInterval));
    }

    const loader = new Loader({
      apiKey: "GOOGLE_MAPS_API_KEY",
      version: "weekly",
      libraries: ["marker"],
    });

    loader.load().then(() => {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 36.1147, lng: -115.1728 }, // Default to LVCC if no data points
        zoom: 10,
        mapId: "4a171c2cfdd5af79", // Your Map ID
      });

      fetchAndDisplayLocations(map);

      const channel = supabase
        .channel("locations-updates")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "locations" },
          (payload) => {
            const timeThreshold = new Date(Date.now() - selectedTimeRange).toISOString();
            if (payload.new.timestamp >= timeThreshold) {
              addPointToRoute(map, payload.new);
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    });
  }, [selectedTimeRange]);

  const fetchAndDisplayLocations = async (map) => {
    try {
      const timeThreshold = new Date(Date.now() - selectedTimeRange).toISOString();
      const { data, error } = await supabase
        .from("locations")
        .select()
        .gte("created_at", timeThreshold);
      if (error) throw error;

      if (data.length === 0) {
        // If no locations, center on LVCC
        map.setCenter({ lat: 36.1147, lng: -115.1728 }); // LVCC coordinates
        map.setZoom(10); // Default zoom
      } else {
        // Initialize a polyline and set the first point
        const path = data.map((location) => ({ lat: location.latitude, lng: location.longitude }));
        polylineRef.current = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#FF0000",
          strokeOpacity: 1.0,
          strokeWeight: 2,
        });
        polylineRef.current.setMap(map);

        // Adjust the map view to fit the route
        const bounds = new google.maps.LatLngBounds();
        path.forEach((point) => bounds.extend(new google.maps.LatLng(point)));
        map.fitBounds(bounds);
      }
    } catch (err) {
      console.error("Error fetching locations:", err.message);
    }
  };

  const addPointToRoute = (map, location) => {
    if (!polylineRef.current) return;

    // Add the new location to the polyline path
    const path = polylineRef.current.getPath();
    const newLocation = new google.maps.LatLng(location.latitude, location.longitude);
    path.push(newLocation);

    // Recalculate the map bounds to include the new point
    const bounds = new google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds);
  };

  const handleTimeRangeChange = (e) => {
    const newTimeRange = Number(e.target.value);
    setSelectedTimeRange(newTimeRange);
    localStorage.setItem("timeRange", newTimeRange); // Persist interval to localStorage
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <img src="/golioth-logo.svg" alt="Golioth Logo" className="logo-img" />
          <h1>Golioth Location Service</h1>
        </div>
        <p className="tagline">Experience seamless IoT location tracking with Golioth</p>
      </header>

      {/* Main Content */}
      <main className="app-content">
        <div className="container-fluid p-3">
        <p className="description">
          The Golioth Location Service enables real-time tracking and visualization of IoT devices.
          With easy-to-use tools and seamless integration, monitor your devices' location history and analyze movement patterns.
          <br /><br />
          Below is a demo we built to show off at CES. Select a time range and explore the possibilities of precise location data.
        </p>
          <div className="mb-3">
            <label htmlFor="timeRange" className="form-label">
              Show locations from the last:
            </label>
            <select
              id="timeRange"
              className="form-select"
              onChange={handleTimeRangeChange}
              value={selectedTimeRange}
            >
              {timeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div ref={mapRef} className="w-100" style={{ height: "90vh" }}></div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>
            Powered by <a href="https://golioth.io" target="_blank" rel="noopener noreferrer">Golioth</a>.
            <br />
            <br />
            Learn more about the <a href="https://blog.golioth.io/golioth-location-private-access/" target="_blank" rel="noopener noreferrer">Location Service</a> on our blog.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;