export type LoadingSize = "sm" | "md" | "lg";

export interface LoadingComponentProps {
  className?: string;
}

export interface InlineLoadingProps {
  size?: LoadingSize;
  className?: string;
}

export interface LoadingWithTextProps {
  text?: string;
  size?: LoadingSize;
  className?: string;
}

// Loading state enum
export enum LoadingState {
  IDLE = "idle",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

// Loading configuration type
export interface LoadingConfig {
  showText?: boolean;
  text?: string;
  size?: LoadingSize;
  delay?: number;
  duration?: number;
}
