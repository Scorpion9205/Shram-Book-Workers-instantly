import { useLiveLocation } from "@/hooks/useLiveLocation";

export function useWorkerLocation(isAvailable: boolean) {
  useLiveLocation(isAvailable);
}
