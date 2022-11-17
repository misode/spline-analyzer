
export async function computeIfAbsent<K, V>(map: Map<K, V>, key: K, getter: (key: K) => Promise<V>): Promise<V> {
	const existing = map.get(key)
	if (existing) {
		return existing
	}
	const value = await getter(key)
	map.set(key, value)
	return value
}

export function clamp(x: number, min: number, max: number) {
	return x < min ? min
		: x > max ? max
			: x
}

export function distance(x1: number, y1: number, x2: number, y2: number) {
	return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))	
}

export function safeSlope(x: number) {
	return isNaN(x) ? 0
		: isFinite(x) ? x
			: x < 0 ? -1000 : 1000
}

export function round(x: number) {
	return Math.floor(x * 1000) / 1000
}
