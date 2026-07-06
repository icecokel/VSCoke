export const FIELD_TILE_SIZE = 32;

export interface PixelPosition {
  x: number;
  y: number;
}

export interface TileCoordinate {
  x: number;
  y: number;
}

export interface CompletedTileStep {
  from: TileCoordinate;
  to: TileCoordinate;
}

export interface TileStepTracker {
  currentTile: TileCoordinate | null;
  tileSize: number;
}

export const pixelToTile = (
  position: PixelPosition,
  tileSize = FIELD_TILE_SIZE,
): TileCoordinate => ({
  x: Math.floor(position.x / tileSize),
  y: Math.floor(position.y / tileSize),
});

export const createTileStepTracker = (
  initialPosition?: PixelPosition,
  tileSize = FIELD_TILE_SIZE,
): TileStepTracker => ({
  currentTile: initialPosition ? pixelToTile(initialPosition, tileSize) : null,
  tileSize,
});

export const consumeCompletedTileStep = (
  tracker: TileStepTracker,
  position: PixelPosition,
): CompletedTileStep | null => {
  const previousTile = tracker.currentTile;
  const currentTile = pixelToTile(position, tracker.tileSize);

  if (!previousTile) {
    tracker.currentTile = currentTile;
    return null;
  }

  if (previousTile.x === currentTile.x && previousTile.y === currentTile.y) {
    return null;
  }

  tracker.currentTile = currentTile;

  const deltaX = Math.abs(currentTile.x - previousTile.x);
  const deltaY = Math.abs(currentTile.y - previousTile.y);

  if (deltaX + deltaY !== 1) {
    return null;
  }

  return {
    from: previousTile,
    to: currentTile,
  };
};
