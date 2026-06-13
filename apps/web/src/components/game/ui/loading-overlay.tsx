import React from "react";

interface LoadingOverlayProps {
  progress: number; // 0 에서 100
}

export const LoadingOverlay = ({ progress }: LoadingOverlayProps) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-64 space-y-4">
        <div className="flex justify-between text-sm font-medium text-muted-foreground">
          <span>Loading...</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
