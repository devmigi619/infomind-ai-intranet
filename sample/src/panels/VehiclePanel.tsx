import { useState } from 'react';
import { Car, Wrench, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { demoVehicles, demoVehicleReservations } from '@/data/demo-data';

export function VehiclePanel() {
  const [selectedDate] = useState('2025-06-10');

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'available':
        return { label: '사용 가능', color: '#43A047', icon: CheckCircle2 };
      case 'reserved':
        return { label: '예약됨', color: '#0A2463', icon: Clock };
      case 'maintenance':
        return { label: '정비 중', color: '#E53935', icon: Wrench };
      default:
        return { label: '알 수 없음', color: '#999', icon: XCircle };
    }
  };

  const todayReservations = demoVehicleReservations.filter(
    (r) => r.date === selectedDate
  );

  return (
    <div className="p-6">
      {/* Vehicle Status Cards */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        {demoVehicles.map((vehicle) => {
          const statusInfo = getStatusInfo(vehicle.status);
          const StatusIcon = statusInfo.icon;
          const isReserved = vehicle.status === 'reserved';
          const reservation = todayReservations.find(
            (r) => r.vehicleId === vehicle.id
          );

          return (
            <div
              key={vehicle.id}
              className="bg-white rounded-md p-4"
              style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Car size={18} style={{ color: statusInfo.color }} />
                  <span className="text-small text-black font-medium">
                    {vehicle.name}
                  </span>
                  <span className="text-micro text-mori-muted">
                    {vehicle.plateNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <StatusIcon size={14} style={{ color: statusInfo.color }} />
                  <span className="text-micro" style={{ color: statusInfo.color }}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>

              {isReserved && reservation && (
                <div className="mt-2 pl-6">
                  <p className="text-small text-black">{reservation.purpose}</p>
                  <p className="text-micro text-mori-muted">
                    {reservation.timeRange} · {reservation.reserver}
                  </p>
                </div>
              )}

              {vehicle.status === 'available' && (
                <button
                  className="mt-2 ml-6 text-small text-[#0A2463] hover:underline"
                >
                  예약하기 &rarr;
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Reservation Timeline */}
      <div>
        <h3 className="text-module-heading text-black mb-3">오늘의 예약 현황</h3>
        {todayReservations.length > 0 ? (
          <div className="space-y-2">
            {todayReservations.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2">
                <span className="text-micro text-[#0A2463] font-medium w-24 flex-shrink-0">
                  {r.timeRange}
                </span>
                <div className="flex-1">
                  <p className="text-small text-black">{r.vehicleName}</p>
                  <p className="text-micro text-mori-muted">
                    {r.purpose} · {r.reserver}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-small text-mori-muted">오늘의 예약이 없습니다</p>
        )}
      </div>
    </div>
  );
}
