import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getUrl = (base: string, endpoint: string) => {
  if (base.endsWith("/")) {
    return `${base}${endpoint}`
  }
  return `${base}/${endpoint}`
}
