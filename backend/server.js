const http = require('http');
const { sequelize } = require('./models');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const app = require('./app');
const { ChatRoom, ChatMessage, ChatRoomExit, Sequelize, User } = require('./models');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');

// .env 로드
dotenv.config();

const sessionMiddleware = session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // 배포 시 true, 개발 시 false
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 개발 시 'lax', 배포 시 'none'
  },
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.use(sharedSession(sessionMiddleware, { autoSave: true }));

const socketMap = {};


io.on('connection', (socket) => {
  console.log('🟢 유저 접속:', socket.id);

  socket.on('login', (userId) => {
    socket.userId = userId;
    socketMap[userId] = { socketId: socket.id, currentRoomId: null };
    console.log(`✅ 유저 로그인 등록됨 → userId=${userId}, socket.id=${socket.id}`);

    ChatRoom.findAll({
      where: {
        [Sequelize.Op.or]: [{ user1_id: userId }, { user2_id: userId }],
      },
    }).then((chatRooms) => {
      chatRooms.forEach((room) => {
        const roomId = `chat-${[room.user1_id, room.user2_id]
          .sort((a, b) => a - b)
          .join('-')}`;
        socket.join(roomId);
        console.log(`✅ login 시 유저 ${userId} → ${roomId} 방 미리 join 처리`);
      });
    });
  });

socket.on('leave_room', async (data) => {
  const userId = data.userId;
  const type = data.type || 'close';

  if (socketMap[userId]) {
    const currentRoomId = socketMap[userId].currentRoomId;
    socketMap[userId].currentRoomId = null;
    console.log(`🚪 유저 ${userId} 채팅방 나감 → currentRoomId null 처리`);

    if (currentRoomId && type === 'exit') {
      try {
        const parts = currentRoomId.split('-');
        const user1Id = parseInt(parts[1]);
        const user2Id = parseInt(parts[2]);
        const sortedUser1Id = Math.min(user1Id, user2Id);
        const sortedUser2Id = Math.max(user1Id, user2Id);

        const chatRoom = await ChatRoom.findOne({
          where: {
            user1_id: sortedUser1Id,
            user2_id: sortedUser2Id,
          },
        });

        if (!chatRoom) return;

        const senderId = userId;
        const receiverId = senderId === sortedUser1Id ? sortedUser2Id : sortedUser1Id;

        const systemMessage = await ChatMessage.create({
          rooms_id: chatRoom.id,
          sender_id: senderId,
          content: '상대방이 채팅을 종료했습니다.',
          is_read: false,
        });

        const messageWithUser = await ChatMessage.findByPk(systemMessage.id, {
          include: [{ model: User, attributes: ['id', 'nickname', 'profile_img'] }],
        });

        const messageToSend = {
          ...messageWithUser.toJSON(),
          roomId: currentRoomId,
          is_read: false,
        };

        // 상대방이 접속해 있다면 메시지 보내기
        if (socketMap[receiverId]) {
          const receiverSocketId = socketMap[receiverId].socketId;
          io.to(receiverSocketId).emit('receive_message', messageToSend);
          console.log(`📩 상대방(${receiverId})에게 종료 메시지 전송 완료`);
        }
      } catch (err) {
        console.error('❌ leave_room 처리 중 에러:', err);
      }
    }
  }
});

  socket.on('join_room', async (roomId, userId) => {
    socket.join(roomId);
    if (socketMap[userId]) {
      socketMap[userId].currentRoomId = roomId;
    }
    console.log(`🔗 ${socket.id} joined room ${roomId}`);
  });

  socket.on('send_message', async (data) => {
    const { roomId, senderId, content } = data;

    try {
      const parts = roomId.split('-');
      const user1Id = parseInt(parts[1]);
      const user2Id = parseInt(parts[2]);
      const sortedUser1Id = Math.min(user1Id, user2Id);
      const sortedUser2Id = Math.max(user1Id, user2Id);

      let chatRoomInstance = await ChatRoom.findOne({
        where: {
          [Sequelize.Op.or]: [
            { user1_id: sortedUser1Id, user2_id: sortedUser2Id },
            { user1_id: sortedUser2Id, user2_id: sortedUser1Id },
          ],
        },
      });

      if (!chatRoomInstance) {
        chatRoomInstance = await ChatRoom.create({
          user1_id: sortedUser1Id,
          user2_id: sortedUser2Id,
        });
        console.log(`🆕 채팅방 생성: ID ${chatRoomInstance.id}`);

        await ChatRoomExit.create({
          chat_rooms_id: chatRoomInstance.id,
          user1_id_active: true,
          user2_id_active: true,
        });
        console.log(`✅ ChatRoomExit 생성됨 for room ${chatRoomInstance.id}`);
      }

      const chatRoomExit = await ChatRoomExit.findOne({
  where: { chat_rooms_id: chatRoomInstance.id }
});

socket.on('mark_as_read', async (roomId) => {
  if (!socket.userId) return;
  console.log(`[SOCKET] mark_as_read 수신: roomId=${roomId}, userId=${socket.userId}`);

  try {
    const parts = roomId.split('-');
    const user1Id = parseInt(parts[1]);
    const user2Id = parseInt(parts[2]);
    const sortedUser1Id = Math.min(user1Id, user2Id);
    const sortedUser2Id = Math.max(user1Id, user2Id);

    const chatRoom = await ChatRoom.findOne({
      where: {
        user1_id: sortedUser1Id,
        user2_id: sortedUser2Id,
      },
    });

    if (!chatRoom) {
      console.log(`🚫 채팅방 없음: ${roomId}`);
      return;
    }

    await ChatMessage.update(
      { is_read: true },
      {
        where: {
          rooms_id: chatRoom.id,
          sender_id: { [Sequelize.Op.ne]: socket.userId },
          is_read: false,
        },
      }
    );

    const updatedMessages = await ChatMessage.findAll({
      where: {
        rooms_id: chatRoom.id,
        sender_id: { [Sequelize.Op.ne]: socket.userId },
        is_read: true,
      },
      attributes: ['id'],
    });

    const readMessageIds = updatedMessages.map((msg) => msg.id);
    const senderUserId = socket.userId === sortedUser1Id ? sortedUser2Id : sortedUser1Id;

    if (socketMap[senderUserId]) {
      const senderSocketId = socketMap[senderUserId].socketId;
      io.to(senderSocketId).emit('read_update', {
        roomId,
        readerId: socket.userId,
        readMessageIds,
      });
      console.log(
        `[SERVER] read_update emit → senderUserId=${senderUserId}, readMessageIds=${readMessageIds}`
      );
    }
  } catch (err) {
    console.error('❌ mark_as_read 처리 중 에러:', err);
  }
});


const isSenderUser1 = chatRoomInstance.user1_id === senderId;
const isOpponentActive = isSenderUser1 ? chatRoomExit.user2_id_active : chatRoomExit.user1_id_active;

console.log(`[send_message] isOpponentActive=${isOpponentActive}, user1_id_active=${chatRoomExit.user1_id_active}, user2_id_active=${chatRoomExit.user2_id_active}`);

if (!isOpponentActive) {
  if (socketMap[senderId]) {
    const senderSocketId = socketMap[senderId].socketId;
    const sortedIds = [chatRoomInstance.user1_id, chatRoomInstance.user2_id].sort((a, b) => a - b);
    io.to(senderSocketId).emit('chat_room_closed', {
      roomId: `chat-${sortedIds[0]}-${sortedIds[1]}`,
      message: '상대방이 채팅방을 나간 상태입니다. 채팅을 새로 시작해야 합니다.',
    });
    console.log(`[send_message] chat_room_closed emit → senderId=${senderId}`);
  }
}

      const newMessage = await ChatMessage.create({
        rooms_id: chatRoomInstance.id,
        sender_id: senderId,
        content: content,
        is_read: false,
      });

      const messageWithUser = await ChatMessage.findByPk(newMessage.id, {
        include: [{ model: User, attributes: ['id', 'nickname', 'profile_img'] }],
      });

      const messageToSend = {
        ...messageWithUser.toJSON(),
        roomId,
        is_read: false,
      };

      io.to(socket.id).emit('receive_message', messageToSend);

      const receiverUserId =
        senderId === sortedUser1Id ? sortedUser2Id : sortedUser1Id;

      if (socketMap[receiverUserId]) {
        const receiverSocketId = socketMap[receiverUserId].socketId;
        const receiverCurrentRoomId = socketMap[receiverUserId].currentRoomId;

          if (receiverCurrentRoomId === roomId) {
  // 읽음 처리 X → receive_message만 전송

  io.to(receiverSocketId).emit('receive_message', messageToSend);
  console.log(
    `📩 유저 ${receiverUserId}는 현재 방 열어놔서 receive_message만 전송 (읽음 처리는 mark_as_read에서만 처리)`
  );
} else {
  io.to(receiverSocketId).emit('receive_message', messageToSend);
  console.log(`📩 유저 ${receiverUserId}에게 receive_message만 전송 (방 안 열려 있음)`);
}
        
        io.to(receiverSocketId).emit('new_chat_room_created', {
          roomId,
          targetUserId: senderId,
        });

        console.log(`🔔 new_chat_room_created emit → roomId=${roomId}, targetUserId=${senderId}`);
      } else {
        console.log(
          `⚠️ receiver ${receiverUserId}는 socketMap에 없어 new_chat_room_created emit 못함`
        );
      }
    } catch (err) {
      console.error('❌ send_message 중 에러 발생:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 유저 연결 해제:', socket.id);
    

  });
});

// 준혁추가 : 실시간 알림
const { initSocket } = require('./notificationSocket');
initSocket(io);

// 서버 실행
const PORT = process.env.PORT || 3065;
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중! http://localhost:${PORT}`);
});