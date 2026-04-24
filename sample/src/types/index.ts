export type PanelType =
  | 'board'
  | 'approval'
  | 'weeklyReport'
  | 'certificate'
  | 'vehicle'
  | 'meetingRoom'
  | 'calendar'
  | null;

export type MessageSender = 'ai' | 'user';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: Date;
  widget?: WidgetData;
  quickActions?: QuickAction[];
}

export interface WidgetData {
  type: PanelType;
  title: string;
  items: WidgetItem[];
}

export interface WidgetItem {
  label: string;
  value?: string;
}

export interface QuickAction {
  label: string;
  action: string;
}

/* Board */
export interface BoardPost {
  id: string;
  category: string;
  title: string;
  author: string;
  date: string;
  views: number;
  comments: number;
  content?: string;
}

/* Approval */
export interface ApprovalItem {
  id: string;
  type: string;
  title: string;
  requester: string;
  date: string;
  status: 'pending' | 'progress' | 'completed' | 'rejected';
}

/* Calendar */
export interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  location: string;
}

/* Weekly Report */
export interface WeeklyReport {
  id: string;
  author: string;
  department: string;
  week: string;
  summary: string;
  status: 'submitted' | 'draft';
  submittedAt?: string;
}

/* Certificate */
export interface CertificateType {
  id: string;
  name: string;
  description: string;
  processingTime: string;
}

export interface CertificateRequest {
  id: string;
  type: string;
  purpose: string;
  status: 'pending' | 'completed';
  requestedAt: string;
}

/* Vehicle */
export interface Vehicle {
  id: string;
  name: string;
  plateNumber: string;
  status: 'available' | 'reserved' | 'maintenance';
}

export interface VehicleReservation {
  id: string;
  vehicleId: string;
  vehicleName: string;
  date: string;
  timeRange: string;
  purpose: string;
  reserver: string;
}

/* Meeting Room */
export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  facilities: string[];
}

export interface RoomReservation {
  id: string;
  roomId: string;
  roomName: string;
  date: string;
  timeRange: string;
  title: string;
  booker: string;
}

export interface NavModule {
  id: PanelType;
  icon: string;
  label: string;
  unread?: number;
}
