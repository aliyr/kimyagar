import { createContext } from 'react';

/** لایه‌ای که اصلاً تیلت نمی‌گیرد؛ حباب مشتری این‌جا پورتال می‌شود. */
export const TiltPinContext = createContext<HTMLElement | null>(null);
