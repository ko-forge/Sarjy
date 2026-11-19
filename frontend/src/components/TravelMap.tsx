import { useEffect } from "react"
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import type { Place } from "../types"
import "leaflet/dist/leaflet.css"

const pin = L.divIcon({
  className: "place-pin",
  html: "<span></span>",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function FlyTo({ place }: { place: Place }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([place.latitude, place.longitude], 11, { duration: 1.1 })
  }, [map, place.latitude, place.longitude])
  return null
}

export function TravelMap({ place }: { place: Place | null }) {
  return (
    <div className="map-pane">
      <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom className="map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {place ? <FlyTo place={place} /> : null}
        {place ? (
          <Marker position={[place.latitude, place.longitude]} icon={pin}>
            <Popup>{place.label}</Popup>
          </Marker>
        ) : null}
      </MapContainer>
      <p className="map-label">{place ? place.label : "Name a place and the pin will move."}</p>
    </div>
  )
}
