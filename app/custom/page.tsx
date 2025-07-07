import { VideoConferenceClientImpl } from './VideoConferenceClientImpl';

export default function CustomRoomConnection() {
  return (
    <main data-lk-theme="default" style={{ height: '100%' }}>
      <VideoConferenceClientImpl />
    </main>
  );
}
