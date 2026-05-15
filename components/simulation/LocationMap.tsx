"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";

function ClickCatcher({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** dynamic(ssr:false) ile yüklenen Leaflet haritası (OSM karoları, token yok). */
export default function LocationMap({
  lat,
  lng,
  onPick,
}: {
  lat: number;
  lng: number;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      key={`${lat.toFixed(3)}-${lng.toFixed(3)}`}
      center={[lat, lng]}
      zoom={11}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", borderRadius: 8 }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={[lat, lng]}
        radius={8}
        pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.8 }}
      />
      <ClickCatcher onPick={onPick} />
    </MapContainer>
  );
}
