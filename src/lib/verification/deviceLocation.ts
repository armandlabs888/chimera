/** One-time browser Geolocation snapshot for home confirmation. */

export type DeviceLocationReading = {
  lat: number
  lng: number
  accuracyM: number
}

export type DeviceLocationErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'unavailable'
  | 'timeout'
  | 'unknown'

export class DeviceLocationError extends Error {
  constructor(
    readonly code: DeviceLocationErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'DeviceLocationError'
  }
}

export function readDeviceLocationOnce(): Promise<DeviceLocationReading> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(
      new DeviceLocationError(
        'unsupported',
        'Location is not available in this browser. Try again on your phone.',
      ),
    )
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new DeviceLocationError(
              'permission_denied',
              'Location access was denied. Turn it on in your browser settings, then try again.',
            ),
          )
          return
        }
        if (err.code === err.TIMEOUT) {
          reject(
            new DeviceLocationError(
              'timeout',
              'Location timed out. Try again on your phone with a clearer signal.',
            ),
          )
          return
        }
        reject(
          new DeviceLocationError(
            'unavailable',
            'Could not read your location. Try again on your phone.',
          ),
        )
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      },
    )
  })
}
