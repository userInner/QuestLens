import {useEffect} from "react";
import {Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix the default marker icon (leaflet's bundler-unfriendly default).
delete (L.Icon.Default.prototype as unknown as {_getIconUrl?: unknown})._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface CommonProps {
  lat: number;
  lon: number;
  radiusM?: number | undefined;
  height?: number;
  zoom?: number;
}

export function MiniMap({lat, lon, radiusM, height = 120, zoom = 14}: CommonProps) {
  return (
    <MapContainer
      center={[lat, lon]}
      zoom={zoom}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      zoomControl={false}
      style={{height, width: "100%", borderRadius: 8}}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lon]} />
      {radiusM ? <Circle center={[lat, lon]} radius={radiusM} pathOptions={{color: "#5eead4"}} /> : null}
    </MapContainer>
  );
}

interface PickerProps extends CommonProps {
  onChange: (lat: number, lon: number) => void;
  height?: number;
}

function Recenter({lat, lon}: {lat: number; lon: number}) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom());
  }, [lat, lon, map]);
  return null;
}

function ClickHandler({onPick}: {onPick: (lat: number, lon: number) => void}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapPicker({lat, lon, radiusM, onChange, height = 280, zoom = 14}: PickerProps) {
  return (
    <MapContainer
      center={[lat, lon]}
      zoom={zoom}
      style={{height, width: "100%", borderRadius: 8}}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lon]} />
      {radiusM ? <Circle center={[lat, lon]} radius={radiusM} pathOptions={{color: "#5eead4"}} /> : null}
      <Recenter lat={lat} lon={lon} />
      <ClickHandler onPick={onChange} />
    </MapContainer>
  );
}
