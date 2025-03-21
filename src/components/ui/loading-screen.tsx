import React from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./loading-spinner";

interface LoadingScreenProps {
  text?: string;
  fullScreen?: boolean;
  className?: string;
  spinnerSize?: "xs" | "sm" | "md" | "lg" | "xl";
  spinnerColor?: string;
  variant?: "default" | "pulse" | "dots" | "minimal";
}

export function LoadingScreen({ 
  text = "Loading...", 
  fullScreen = true,
  className = "",
  spinnerSize = "lg",
  spinnerColor,
  variant = "default"
}: LoadingScreenProps) {
  const containerClasses = cn(
    "bg-background flex flex-col items-center justify-center gap-4 p-6",
    fullScreen ? "fixed inset-0 z-50" : "min-h-[200px] w-full",
    className
  );

  const renderLoadingContent = () => {
    switch (variant) {
      case "pulse":
        return (
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className={cn(
              "rounded-full bg-muted",
              spinnerSize === "xs" ? "h-4 w-4" : 
              spinnerSize === "sm" ? "h-6 w-6" :
              spinnerSize === "md" ? "h-8 w-8" :
              spinnerSize === "lg" ? "h-12 w-12" : "h-16 w-16"
            )}></div>
            {text && <div className="h-2 w-24 bg-muted rounded"></div>}
          </div>
        );
      
      case "dots":
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="flex space-x-2">
              {[0, 1, 2].map((dot) => (
                <div 
                  key={dot}
                  className={cn(
                    "rounded-full bg-primary",
                    "animate-bounce",
                    spinnerSize === "xs" ? "h-2 w-2" : 
                    spinnerSize === "sm" ? "h-3 w-3" :
                    spinnerSize === "md" ? "h-4 w-4" :
                    spinnerSize === "lg" ? "h-5 w-5" : "h-6 w-6",
                    "animation-delay-" + (dot * 150)
                  )}
                  style={{
                    animationDelay: `${dot * 0.15}s`
                  }}
                ></div>
              ))}
            </div>
            {text && <p className="text-sm text-muted-foreground">{text}</p>}
          </div>
        );
      
      case "minimal":
        return <LoadingSpinner size={spinnerSize} color={spinnerColor} />;
      
      default:
        return (
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size={spinnerSize} color={spinnerColor} />
            {text && <p className="text-sm font-medium text-muted-foreground">{text}</p>}
          </div>
        );
    }
  };

  return (
    <div className={containerClasses}>
      {renderLoadingContent()}
    </div>
  );
} 