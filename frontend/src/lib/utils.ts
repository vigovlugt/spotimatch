import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const PROD = import.meta.env.PROD || true;

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
