import { io } from 'socket.io-client';

const socket = io('http://localhost:3065', {
  withCredentials: true, // ✅ 이거 꼭 필요해!
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('🌐 Socket Connected! ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('💔 Socket Disconnected. Reason:', reason);
});

socket.on('connect_error', (error) => {
  console.error('⚠️ Socket Connection Error:', error);
});


// 준혁추가 : 로그인 사용자 알림 피드
// 서버에 유저 ID 전달
export const registerUserSocket = (userId) => {
  if (userId) { socket.emit('register_user', userId); } };

// 알림 이벤트 구독 함수 추가
export const subscribeToNotifications = (callback) => {
  socket.on('notification', callback); };

export const unsubscribeFromNotifications = () => {
  socket.off('notification'); };
//

export default socket;
