import { Point } from './components/SplineEditor'

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

export function isObject(n: unknown) {
	return typeof n === 'object' && n !== null
}

export function parseSource(source: string): Point[] {
	try {
		const json = JSON.parse(source)
		return parseDensityFunction(json)
	} catch (e) {
		return []
	}
}

function parseDensityFunction(df: any): Point[] {
	if (!isObject(df)) {
		return []
	}
	const type = df.type?.replace(/^minecraft:/, '')
	switch (type) {
		case 'spline': {
			return parseSpline(df.spline)
		}
		case 'flat_cache':
		case 'cache_2d': {
			return parseDensityFunction(df.argument)
		}
		case 'add':
		case 'mul':
		case 'min':
		case 'max': {
			const first = parseDensityFunction(df.argument1)
			return first.length > 0 ? first : parseDensityFunction(df.argument2)
		}
		default: return []
	}
}

function parseSpline(spline: any): Point[] {
	if (!isObject(spline)) return []
	if (!Array.isArray(spline.points)) return []
	return spline.points.flatMap((p: any) => {
		if (!isObject(p)) return []
		return [{
			x: p.location,
			y: typeof p.value === 'number' ? p.value : 0,
			slope: p.derivative ?? 0,
		}]
	})
}

export function updateSource(source: string, points: Point[]): string {
	try {
		const json = JSON.parse(source)
		const df = updateDensityFunction(json, points)
		return JSON.stringify(df, null, 2)
	} catch (e) {
		return source
	}
}

function updateDensityFunction(df: any, points: Point[]): any {
	if (!isObject(df)) {
		return df
	}
	const type = df.type?.replace(/^minecraft:/, '')
	switch (type) {
		case 'spline': return {
			...df,
			spline: updateSpline(df.spline, points),
		}
		case 'flat_cache':
		case 'cache_2d': return {
			...df,
			argument: updateDensityFunction(df.argument, points),
		}
		case 'add':
		case 'mul':
		case 'min':
		case 'max': {
			const first = parseDensityFunction(df.argument1)
			return first.length > 0 ? {
				...df,
				argument1: updateDensityFunction(df.argument1, points),
				argument2: df.argument2,
			} : {
				...df,
				argument1: df.argument1,
				argument2: updateDensityFunction(df.argument2, points),
			}
		}
		default: return df
	}
}

function updateSpline(spline: any, points: Point[]): any {
	if (!isObject(spline)) return []
	if (!Array.isArray(spline.points)) return []

	return {
		coordinate: spline.coordinate,
		points: spline.points.map((p: any, i: number) => {
			if (typeof p.value !== 'number') return p
			return {
				location: round(points[i].x),
				value: round(points[i].y),
				derivative: round(points[i].slope),
			}
		}),
	}
}
