import type { TabId } from '@/components/TabBar';
import { ChatArea } from '@/components/ChatArea';
import { BoardMainPage } from '@/pages/BoardMainPage';
import { ApprovalMainPage } from '@/pages/ApprovalMainPage';
import { WeeklyReportMainPage } from '@/pages/WeeklyReportMainPage';
import { CertificateMainPage } from '@/pages/CertificateMainPage';
import { VehicleMainPage } from '@/pages/VehicleMainPage';
import { MeetingRoomMainPage } from '@/pages/MeetingRoomMainPage';
import { CalendarMainPage } from '@/pages/CalendarMainPage';
import { SearchResultPage } from '@/pages/SearchResultPage';
import type { ChatMessage } from '@/types';

interface MainContentAreaProps {
  activeTab: TabId;
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (text: string) => void;
  isTyping: boolean;
  searchQuery?: string;
}

export function MainContentArea({
  activeTab,
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  isTyping,
  searchQuery,
}: MainContentAreaProps) {
  switch (activeTab) {
    case 'main':
      return (
        <ChatArea
          messages={messages}
          inputValue={inputValue}
          onInputChange={onInputChange}
          onSendMessage={onSendMessage}
          isTyping={isTyping}
        />
      );
    case 'board':
      return <BoardMainPage />;
    case 'approval':
      return <ApprovalMainPage />;
    case 'weeklyReport':
      return <WeeklyReportMainPage />;
    case 'certificate':
      return <CertificateMainPage />;
    case 'vehicle':
      return <VehicleMainPage />;
    case 'meetingRoom':
      return <MeetingRoomMainPage />;
    case 'calendar':
      return <CalendarMainPage />;
    case 'search':
      return <SearchResultPage query={searchQuery || ''} />;
    default:
      return (
        <ChatArea
          messages={messages}
          inputValue={inputValue}
          onInputChange={onInputChange}
          onSendMessage={onSendMessage}
          isTyping={isTyping}
        />
      );
  }
}
