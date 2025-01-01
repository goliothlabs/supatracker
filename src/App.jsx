import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Loader } from "@googlemaps/js-api-loader";

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
        .gte("timestamp", timeThreshold);
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
    <div>
      <div style={{ margin: "10px" }}>
        <label htmlFor="timeRange">Show locations from the last: </label>
        <select id="timeRange" onChange={handleTimeRangeChange} value={selectedTimeRange}>
          {timeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div ref={mapRef} style={{ width: "100vw", height: "90vh" }}></div>
    </div>
  );
}

export default App;
