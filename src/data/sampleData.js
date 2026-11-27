const start = Date.now()

function makeReadings(deviceId, deviceName, kind, unit, values) {
  return values.map((value, index) => ({
    id: `${deviceId}-${index}`,
    deviceId,
    deviceName,
    kind,
    value,
    unit,
    recordedAt: new Date(start - (values.length - 1 - index) * 10 * 60 * 1000).toISOString(),
  }))
}

function roomReadings(suffix, temperatures, humidities) {
  return [
    ...makeReadings(`CB-ND-${suffix}`, 'Cảm biến nhiệt độ', 'temperature', '°C', temperatures),
    ...makeReadings(`CB-DA-${suffix}`, 'Cảm biến độ ẩm', 'humidity', '%', humidities),
  ].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
}

export const sampleRooms = [
  {
    id: 'P-01', name: 'Phòng thịt tươi', warehouse: 'Kho trung tâm', product: 'Thịt tươi',
    minTemp: 0, maxTemp: 4, minHumidity: 75, maxHumidity: 90,
    alerts: [],
    devices: [
      { id: 'QT-01', name: 'Quạt tuần hoàn', kind: 'fan', online: true, powerState: 'on', controllable: true },
      { id: 'MN-01', name: 'Máy nén lạnh', kind: 'compressor', online: true, powerState: 'on', controllable: true },
    ],
    readings: roomReadings('01', [2.8, 3.1, 2.9, 3.2, 3.0, 2.7, 2.9, 2.6, 2.8, 2.7, 2.5, 2.6], [82, 83, 81, 84, 84, 82, 80, 82, 83, 84, 82, 83]),
  },
  {
    id: 'P-02', name: 'Phòng rau củ', warehouse: 'Kho trung tâm', product: 'Rau củ',
    minTemp: 2, maxTemp: 8, minHumidity: 85, maxHumidity: 95,
    alerts: [{ id: 'CB-02', severity: 'warning', message: 'Nhiệt độ phòng rau củ vượt ngưỡng cho phép.', createdAt: new Date(start).toISOString() }],
    devices: [
      { id: 'QT-02', name: 'Quạt tuần hoàn', kind: 'fan', online: true, powerState: 'on', controllable: true },
      { id: 'MN-02', name: 'Máy nén lạnh', kind: 'compressor', online: true, powerState: 'off', controllable: true },
    ],
    readings: roomReadings('02', [5.3, 5.2, 5.5, 5.1, 5.0, 5.4, 5.2, 5.6, 5.3, 5.1, 7.6, 9.1], [90, 91, 89, 90, 91, 92, 90, 89, 91, 92, 90, 91]),
  },
  {
    id: 'P-03', name: 'Phòng hải sản', warehouse: 'Kho trung tâm', product: 'Hải sản tươi',
    minTemp: 0, maxTemp: 3, minHumidity: 80, maxHumidity: 90,
    alerts: [{ id: 'CB-03', severity: 'warning', message: 'Độ ẩm phòng hải sản vượt ngưỡng cho phép.', createdAt: new Date(start).toISOString() }],
    devices: [
      { id: 'QT-03', name: 'Quạt tuần hoàn', kind: 'fan', online: true, powerState: 'off', controllable: true },
      { id: 'MN-03', name: 'Máy nén lạnh', kind: 'compressor', online: false, powerState: 'unknown', controllable: true },
    ],
    readings: roomReadings('03', [1.2, 1.4, 1.3, 1.5, 1.1, 1.6, 1.8, 2.0, 1.9, 2.2, 2.1, 2.4], [85, 84, 86, 83, 85, 84, 86, 87, 88, 89, 91, 94]),
  },
]
