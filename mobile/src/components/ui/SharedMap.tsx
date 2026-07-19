import { forwardRef } from 'react';
import MapView, { UrlTile, MapViewProps } from 'react-native-maps';
import { useFullTheme } from '../../theme/ThemeProvider';

// CartoDB tiles — production-safe, free for development, no billing required.
// Light: https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png
// Dark:  https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png
const LIGHT_TILE_URL = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
const DARK_TILE_URL = 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

export type SharedMapRef = MapView;

export interface SharedMapProps extends MapViewProps {
  /** OpenStreetMap tile size (default 256) */
  tileSize?: number;
}

const SharedMap = forwardRef<SharedMapRef, SharedMapProps>(({ tileSize = 256, children, ...props }, ref) => {
  const { isDark } = useFullTheme();

  return (
    <MapView
      ref={ref}
      {...props}
      provider={undefined}
    >
      <UrlTile
        urlTemplate={isDark ? DARK_TILE_URL : LIGHT_TILE_URL}
        zIndex={-1}
        tileSize={tileSize}
      />
      {children}
    </MapView>
  );
});

SharedMap.displayName = 'SharedMap';

export default SharedMap;
