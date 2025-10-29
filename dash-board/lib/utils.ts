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

export function camelToWords(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2') // add space before capital letters
    .replace(/^./, (s: string) => s.toUpperCase()); // capitalize first letter
}