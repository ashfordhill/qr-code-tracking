import { useCallback, useRef } from 'react';
import Map, { Layer, Source, type MapRef, type MapMouseEvent } from 'react-map-gl/mapbox';
import type { CircleLayer } from 'mapbox-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { Label } from '../types';

interface Props {
  labels: Label[];
  selectedId: string | null;
  onSelect: (label: Label) => void;
}

const dotsLayer: CircleLayer = {
  id: 'labels-dots',
  type: 'circle',
  source: 'labels',
  paint: {
    'circle-radius': 8,
    'circle-color': '#6366f1',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#e2e8f0',
    'circle-opacity': 0.9,
  },
};

const selectedLayer: CircleLayer = {
  id: 'labels-dots-selected',
  type: 'circle',
  source: 'labels',
  paint: {
    'circle-radius': 11,
    'circle-color': '#818cf8',
    'circle-stroke-width': 2.5,
    'circle-stroke-color': '#ffffff',
  },
};

export default function MapView({ labels, selectedId, onSelect }: Props) {
  const mapRef = useRef<MapRef>(null);

  const geojson: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: labels.map(l => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [l.longitude, l.latitude] },
      properties: { id: l.id },
    })),
  };

  const selectedGeojson: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: labels
      .filter(l => l.id === selectedId)
      .map(l => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [l.longitude, l.latitude] },
        properties: { id: l.id },
      })),
  };

  const onClick = useCallback((e: MapMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const label = labels.find(l => l.id === feature.properties?.id);
    if (label) onSelect(label);
  }, [labels, onSelect]);

  const onLoad = useCallback(() => {
    const map = mapRef.current;
    if (!map || labels.length === 0) return;
    if (labels.length === 1) {
      map.flyTo({ center: [labels[0].longitude, labels[0].latitude], zoom: 14 });
    } else {
      const lngs = labels.map(l => l.longitude);
      const lats = labels.map(l => l.latitude);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 80 },
      );
    }
  }, [labels]);

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      initialViewState={{ longitude: -98.5795, latitude: 39.8283, zoom: 4 }}
      style={{ flex: 1 }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      interactiveLayerIds={['labels-dots']}
      onClick={onClick}
      onLoad={onLoad}
      cursor="auto"
    >
      <Source id="labels" type="geojson" data={geojson}>
        <Layer {...dotsLayer} />
      </Source>
      <Source id="labels-selected" type="geojson" data={selectedGeojson}>
        <Layer {...selectedLayer} />
      </Source>
    </Map>
  );
}
