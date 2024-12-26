import * as publicEnv from '$env/static/public';

export const PUBLIC_BASE_URL: string = Object.hasOwn(publicEnv, 'PUBLIC_BASE_URL')
	? publicEnv.PUBLIC_BASE_URL
	: '';
