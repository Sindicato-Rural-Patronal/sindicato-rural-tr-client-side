export const BODY_LIMIT: number
export function postBytes(bytes: number): Promise<{ status: number; size: number | null }>
