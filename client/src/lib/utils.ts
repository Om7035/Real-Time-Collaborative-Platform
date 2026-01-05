import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getInitials(name: string) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function getRandomColor(id: string) {
    const colors = [
        '#EF4444',
        '#F97316',
        '#F59E0B',
        '#10B981',
        '#06B6D4',
        '#3B82F6',
        '#6366F1',
        '#8B5CF6',
        '#EC4899',
        '#F43F5E',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}
