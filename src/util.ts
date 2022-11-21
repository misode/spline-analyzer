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

export function wrap(e: unknown, prefix: string) {
	if (e instanceof Error) {
		const error = new Error(prefix + e.message)
		error.stack = e.stack
		return error
	}
}

export function parseSource(source: string): Point[] {
	try {
		const json = JSON.parse(source)
		const points = parseDensityFunction(json)
		if (points === undefined) {
			throw new Error('No spline found in density function')
		}
		return points
	} catch (e) {
		throw wrap(e, '')
	}
}

function parseDensityFunction(df: any): Point[] | undefined {
	if (!isObject(df)) {
		return undefined
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
			return parseDensityFunction(df.argument1) ?? parseDensityFunction(df.argument2)
		}
		default: return undefined
	}
}

function parseSpline(spline: any): Point[] | undefined {
	if (!isObject(spline)) return undefined
	if (!Array.isArray(spline.points)) return undefined
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
			return {
				...df,
				argument1: first !== undefined ? updateDensityFunction(df.argument1, points) : df.argument1,
				argument2: first !== undefined ? df.argument2 : updateDensityFunction(df.argument2, points),
			}
		}
		default: return df
	}
}

function updateSpline(spline: any, points: Point[]): any {
	if (!isObject(spline)) return spline
	if (!Array.isArray(spline.points)) return spline

	const result: any[] = []
	let i = 0
	let j = 0
	while (i < spline.points.length && j < points.length) {
		const pointA = spline.points[i]
		const pointB = points[j]
		const newPoint = {
			location: round(pointB.x),
			value: round(pointB.y),
			derivative: round(pointB.slope),
		}
		if (pointA.location === pointB.x) {
			i += 1
			j += 1
			if (typeof pointA.value === 'number' && (pointA.value !== pointB.y || pointA.derivative !== pointB.slope)) { // point y or slope updated
				result.push(newPoint)
			} else { // not allowed to change nested point
				result.push(pointA)
			}
		} else if (pointA.location === points[j + 1]?.x) { // point inserted
			j += 1
			result.push(newPoint)
		} else if (spline.points[i + 1]?.location === pointB.x) { // point removed
			i += 1
		} else if (spline.points[i + 1]?.location === points[j + 1]?.x) { // point x
			i += 1
			j += 1
			if (typeof pointA.value === 'number') {
				console.log('update!')
				result.push(newPoint)
			} else { // not allowed to change nested point
				result.push(pointA)
			}
		} else {
			console.error('Unhandled case...', pointA, pointB)
			break
		}
	}

	return {
		coordinate: spline.coordinate,
		points: result,
	}
}
