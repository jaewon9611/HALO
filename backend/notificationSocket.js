// socket/notificationSocket.js
let ioInstance = null;
let userSockets = new Map(); // 유저 ID → 소켓 ID

function initSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log('🟢 유저 접속:', socket.id);

    socket.on('register_user', (userId) => {
      userSockets.set(userId, socket.id);
      console.log(`✅ 유저 ${userId} 소켓 등록: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      for (const [userId, sId] of userSockets.entries()) {
        if (sId === socket.id) {
          userSockets.delete(userId);
          console.log(`🔴 유저 ${userId} 소켓 등록 해제`);
          break;
        }
      }
    });
  });
}

function sendNotification(userId, notificationData) {
  if (!ioInstance) {
    console.error('❌ 소켓이 초기화되지 않았습니다.');
    return;
  }

  const socketId = userSockets.get(userId);
  if (socketId) {
    ioInstance.to(socketId).emit('notification', notificationData);
    console.log(`📢 유저 ${userId}에게 알림 전송:`, notificationData);
  } else {
    console.log(`⚠️ 유저 ${userId}는 현재 접속 중이 아님`);
  }
}

module.exports = { initSocket, sendNotification };
