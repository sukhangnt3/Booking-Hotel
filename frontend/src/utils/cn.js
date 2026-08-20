import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Hàm cn giúp gộp các class Tailwind CSS và xử lý xung đột
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
