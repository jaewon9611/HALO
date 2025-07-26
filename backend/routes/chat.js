const express = require('express');
const router = express.Router();
const { Op } = require('sequelize'); 

const { ChatRoom, User, ChatMessage, ChatRoomExit,Sequelize } = require('../models');
const { isLoggedIn } = require('./middlewares'); 
const { io, socketMap } = require('../server');

router.post('/', isLoggedIn, async (req, res, next) => {
  try {
    const user1_id = req.user.id;
const user2_id = Number(req.body.targetUserId);

console.log('[POST /] user1_id:', user1_id, 'user2_id:', user2_id, 'typeof user2_id:', typeof user2_id, 'raw targetUserId:', req.body.targetUserId);

if (!Number.isInteger(user2_id) || user2_id <= 0) {
  return res.status(400).json({ error: 'targetUserId is required and must be a positive integer' });
}

if (user1_id === user2_id) {
  return res.status(400).send('본인과 채팅방을 생성할 수 없어.');
}

const sortedIds = [user1_id, user2_id].sort((a, b) => a - b);

if (!Array.isArray(sortedIds) || sortedIds.length !== 2 || !Number.isInteger(sortedIds[0]) || !Number.isInteger(sortedIds[1])) {
  console.error(`[POST /] 🚨 emit 방어 → sortedIds 값 이상함: ${JSON.stringify(sortedIds)}`);
  return res.status(400).send('잘못된 채팅방 생성 요청이야.');
}
    let chatRoom = await ChatRoom.findOne({
      where: {
        [Op.or]: [
          { user1_id: user1_id, user2_id: user2_id },
          { user1_id: user2_id, user2_id: user1_id },
        ],
      },
    });

    if (chatRoom) {
      console.log(`[POST /] 기존 채팅방 조회 완료: ID ${chatRoom.id}`);

let chatRoomExit = await ChatRoomExit.findOne({
  where: { chat_rooms_id: chatRoom.id },
});


console.log('✅ chatRoomExit 확인:', chatRoomExit);


if (!chatRoomExit) {
  chatRoomExit = await ChatRoomExit.create({
    chat_rooms_id: chatRoom.id,
    user1_id_active: true,
    user2_id_active: true,
    user1_exited_at: null,
    user2_exited_at: null,
  });


  console.log('✅ chatRoomExit 생성 완료:', chatRoomExit);
}

const senderIsUser1 = chatRoom.user1_id === req.user.id;


console.log('✅ senderIsUser1 확인:', senderIsUser1);


console.log('✅ 최종 chatRoomExit 상태:', chatRoomExit.user1_id_active, chatRoomExit.user2_id_active);

const receiverIsActive = senderIsUser1 
  ? chatRoomExit.user2_id_active 
  : chatRoomExit.user1_id_active;


console.log('✅ receiverIsActive:', receiverIsActive);


if (!receiverIsActive) {
  console.log(`[POST /] 기존방이나 상대방 inactive → emit 보내기`);
  const sortedIds = [chatRoom.user1_id, chatRoom.user2_id].sort((a, b) => a - b);
  if (socketMap && socketMap[sortedIds[0]]) {
    io.to(socketMap[sortedIds[0]].socketId).emit('new_chat_room_created', {
      roomId: `chat-${sortedIds[0]}-${sortedIds[1]}`,
      targetUserId: sortedIds[1],
    });
  } else {
    console.log(`[POST /] socketMap에 sortedIds[0](${sortedIds[0]}) 없음.`);
  }
  if (socketMap && socketMap[sortedIds[1]]) {
  io.to(socketMap[sortedIds[1]].socketId).emit('new_chat_room_created', {
    roomId: `chat-${sortedIds[0]}-${sortedIds[1]}`,
    targetUserId: sortedIds[0],
  });
} else {
  console.log(`[POST /] socketMap에 sortedIds[1](${sortedIds[1]}) 없음.`);
}
}

return res.status(200).json(chatRoom);
}
if (!chatRoom && !req.body.allowCreate) {
  console.log(`[POST /] allowCreate 없이 방 없음 → 404 반환`);
  return res.status(404).send('채팅방이 존재하지 않아.');
}
    chatRoom = await ChatRoom.create({
    user1_id: sortedIds[0],
    user2_id: sortedIds[1],
    });

    await ChatRoomExit.create({
      chat_rooms_id: chatRoom.id,
      user1_id_active: true,
      user2_id_active: true,
    });
    console.log(`[POST /] 새로운 채팅방 생성 및 ChatRoomExit 생성 완료: ID ${chatRoom.id}`);
console.log(`[POST /] new_chat_room_created emit 준비용 → sortedIds=${JSON.stringify(sortedIds)}`);

if (Array.isArray(sortedIds) && sortedIds.length === 2) {
  console.log(`[POST /] new_chat_room_created emit 준비: roomId=chat-${sortedIds[0]}-${sortedIds[1]}, targetUserId=${sortedIds[1]}`);

}

    res.status(201).json(chatRoom);
  } catch (error) {
    console.error('❌ [POST /] 채팅방 생성/조회 에러:', error);
    next(error);
  }
});


router.get('/', isLoggedIn, async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log(`[GET /] 채팅방 목록 조회 요청: userId=${userId}`);

    const chatRooms = await ChatRoom.findAll({
      where: {
        [Op.or]: [
          { user1_id: userId },
          { user2_id: userId },
        ],
      },
      include: [
        {
          model: User,
          as: 'User1',
          attributes: ['id', 'nickname' , 'profile_img'],
        },
        {
          model: User,
          as: 'User2',
          attributes: ['id', 'nickname', 'profile_img'],
        },
        {
          model: ChatRoomExit,
          required: false 
        }
      ],
      order: [['createdAt', 'DESC']],
    });
    console.log(`[GET /] 총 ${chatRooms.length}개의 채팅방 조회 완료.`);


    const filteredChatRooms = chatRooms.filter(room => {
        if (!room.ChatRoomExits || room.ChatRoomExits.length === 0) {
            console.log(`[GET /] 채팅방 ${room.id} ChatRoomExits 정보 없음. 활성화로 간주.`);
            return true;
        }

        const exitInfo = room.ChatRoomExits[0];

        if (room.user1_id === userId) {
            console.log(`[GET /] 채팅방 ${room.id} (user1): ${exitInfo.user1_id_active ? '활성' : '비활성'}`);
            return exitInfo.user1_id_active;
        } else { 
            console.log(`[GET /] 채팅방 ${room.id} (user2): ${exitInfo.user2_id_active ? '활성' : '비활성'}`);
            return exitInfo.user2_id_active;
        }
    });
    console.log(`[GET /] 필터링 후 ${filteredChatRooms.length}개의 채팅방 반환.`);

    res.status(200).json(filteredChatRooms);
  } catch (error) {
    console.error('❌ [GET /] 채팅방 목록 조회 에러:', error);
    next(error);
  }
});

router.patch('/:chatRoomId/exit', isLoggedIn, async (req, res, next) => {
  try {
    const chatRoomId = parseInt(req.params.chatRoomId, 10);
    const userId = req.user.id;
    console.log(`[PATCH /:chatRoomId/exit] 채팅방 나가기 요청: roomId=${chatRoomId}, userId=${userId}`);

    const chatRoom = await ChatRoom.findOne({ where: { id: chatRoomId } });
    if (!chatRoom) {
      console.log(`[PATCH /:chatRoomId/exit] 채팅방 없음: ID ${chatRoomId}`);
      return res.status(404).send('채팅방이 존재하지 않아.');
    }

    let chatRoomExit = await ChatRoomExit.findOne({ where: { chat_rooms_id: chatRoomId } });

    if (!chatRoomExit) {

      chatRoomExit = await ChatRoomExit.create({ chat_rooms_id: chatRoomId });
      console.log(`[PATCH /:chatRoomId/exit] ChatRoomExit 레코드 생성: chat_rooms_id=${chatRoomId}`);
    }

    const exitedAt = new Date(); 

    if (chatRoom.user1_id === userId) {
      await ChatRoomExit.update({
        user1_id_active: false,
        user1_exited_at: exitedAt,
      }, {
        where: { chat_rooms_id: chatRoomId },
      });
      console.log(`[PATCH /:chatRoomId/exit] user1_id_active false 설정, user1_exited_at=${exitedAt}`);
    } else if (chatRoom.user2_id === userId) {
      await ChatRoomExit.update({
        user2_id_active: false,
        user2_exited_at: exitedAt,
      }, {
        where: { chat_rooms_id: chatRoomId },
      });

      console.log(`[PATCH /:chatRoomId/exit] user2_id_active false 설정, user2_exited_at=${exitedAt}`);
    } else {
      console.log(`[PATCH /:chatRoomId/exit] 권한 없음: userId=${userId}는 해당 채팅방에 참여하고 있지 않음.`);
      return res.status(403).send('해당 채팅방에 참여하고 있지 않아.');
    }

    console.log(`[PATCH /:chatRoomId/exit] ChatRoomExit 상태 업데이트 완료.`);


    const updatedChatRoomExit = await ChatRoomExit.findOne({ where: { chat_rooms_id: chatRoomId } });
    console.log(`[PATCH /:chatRoomId/exit] 업데이트된 ChatRoomExit 상태 조회 완료:`, updatedChatRoomExit.toJSON());

    const user1Active = updatedChatRoomExit.user1_id_active;
    const user2Active = updatedChatRoomExit.user2_id_active;

if (user1Active || user2Active) {
  const opponentId = (chatRoom.user1_id === userId) ? chatRoom.user2_id : chatRoom.user1_id;

  if (typeof opponentId !== 'undefined' && socketMap[opponentId] && socketMap[opponentId].socketId) {
    const sortedIds = [chatRoom.user1_id, chatRoom.user2_id].sort((a, b) => a - b);
    const opponentSocketId = socketMap[opponentId].socketId;

    io.to(opponentSocketId).emit('chat_room_closed', {
      roomId: `chat-${sortedIds[0]}-${sortedIds[1]}`,
      message: '상대방이 채팅방을 나갔습니다. 채팅을 새로 시작해야 합니다.'
    });
    console.log(`[PATCH /:chatRoomId/exit] 남아있는 유저에게 알림 emit → opponentId=${opponentId}`);
  } else {
    console.log(`[PATCH /:chatRoomId/exit] socketMap[opponentId=${opponentId}] 없음 또는 socketId 없음 → chat_room_closed emit 생략`);
  }
}


if (!updatedChatRoomExit.user1_id_active && !updatedChatRoomExit.user2_id_active) {
  console.log(`[PATCH /:chatRoomId/exit] 유저 2명 모두 나감 → 채팅방 및 메시지 삭제 시작.`);

  await ChatMessage.destroy({ where: { rooms_id: chatRoomId } });
  console.log(`[PATCH /:chatRoomId/exit] ChatMessages 삭제 완료.`);

  await ChatRoomExit.destroy({ where: { chat_rooms_id: chatRoomId } });
  console.log(`[PATCH /:chatRoomId/exit] ChatRoomExit 삭제 완료.`);

  await ChatRoom.destroy({ where: { id: chatRoomId } });
  console.log(`[PATCH /:chatRoomId/exit] ChatRoom 삭제 완료.`);
}


    res.status(200).json({ message: '채팅방을 나갔어.', chatRoomExit: updatedChatRoomExit });
  } catch (error) {
    console.error('❌ [PATCH /:chatRoomId/exit] 채팅방 나가기 에러:', error);
    next(error);
  }
});

router.patch('/:chatRoomId/rejoin', isLoggedIn, async (req, res, next) => {
  try {
    const chatRoomId = parseInt(req.params.chatRoomId, 10);
    const userId = req.user.id;
    console.log(`[PATCH /:chatRoomId/rejoin] 채팅방 다시 참여 요청: roomId=${chatRoomId}, userId=${userId}`);

    const chatRoom = await ChatRoom.findOne({ where: { id: chatRoomId } });
    if (!chatRoom) {
      console.log(`[PATCH /:chatRoomId/rejoin] 채팅방 없음: ID ${chatRoomId}`);
      return res.status(404).send('채팅방이 존재하지 않아.');
    }

    let chatRoomExit = await ChatRoomExit.findOne({ where: { chat_rooms_id: chatRoomId } });

    if (!chatRoomExit) {
      console.log(`[PATCH /:chatRoomId/rejoin] ChatRoomExit 레코드 없음. 이미 활성화된 것으로 간주.`);
      return res.status(200).send('이미 활성화된 채팅방이야.');
    }

    if (chatRoom.user1_id === userId) {
      chatRoomExit.user1_id_active = true;
      chatRoomExit.user1_exited_at = null;
      console.log(`[PATCH /:chatRoomId/rejoin] user1_id_active를 true로 설정`);
    } else if (chatRoom.user2_id === userId) {
      chatRoomExit.user2_id_active = true;
      chatRoomExit.user2_exited_at = null;
      console.log(`[PATCH /:chatRoomId/rejoin] user2_id_active를 true로 설정`);
    } else {
      console.log(`[PATCH /:chatRoomId/rejoin] 권한 없음: userId=${userId}는 해당 채팅방에 참여하고 있지 않음.`);
      return res.status(403).send('해당 채팅방에 참여하고 있지 않아.');
    }

    await chatRoomExit.save();
    console.log(`[PATCH /:chatRoomId/rejoin] ChatRoomExit 상태 저장 완료.`);

    res.status(200).json({ message: '채팅방에 다시 참여했어.', chatRoomExit });
  } catch (error) {
    console.error('❌ [PATCH /:chatRoomId/rejoin] 채팅방 다시 참여 에러:', error);
    next(error);
  }
});

router.post('/message', isLoggedIn, async (req, res, next) => {
  try {
    const { roomsId, content } = req.body; 
    console.log(`[POST /message] roomsId=${roomsId}, content=${content}`);
    const senderId = req.user.id;

    const roomsIdNum = Number(roomsId);
if (isNaN(roomsIdNum)) {
  console.log(`[POST /message] roomsId 변환 실패 → 잘못된 값: ${roomsId}`);
  return res.status(400).send('잘못된 roomsId');
}

console.log(`[POST /message] roomsId 변환 확인 → Number: ${roomsIdNum}`);

    console.log(`[POST /message] roomsId param type: ${typeof roomsId}, value: ${roomsId}`);

    console.log(`[POST /message] 메시지 전송 요청: roomId=<span class="math-inline">\{roomsId\}, senderId\=</span>{senderId}, content='${content}'`);

    if (!roomsId || !content) {
      console.log('[POST /message] 필수 정보 누락: roomsId 또는 content');
      return res.status(400).send('채팅방 ID와 내용을 모두 입력해야 해.');
    }

    const chatRoom = await ChatRoom.findOne({ where: { id: roomsIdNum } });
    if (!chatRoom) {
      console.log(`[POST /message] 채팅방 없음: ID ${roomsId}`);
      return res.status(404).send('채팅방이 존재하지 않아.');
    }
    if (chatRoom.user1_id !== senderId && chatRoom.user2_id !== senderId) {
      console.log(`[POST /message] 권한 없음: senderId=${senderId}는 해당 채팅방에 참여하고 있지 않음.`);
      return res.status(403).send('채팅방에 참여하고 있지 않아.');
    }

        const chatRoomExit = await ChatRoomExit.findOne({
      where: { chat_rooms_id: roomsIdNum }
    });


const senderFieldToUpdate = (chatRoom.user1_id === senderId) ? 'user1_id_active' : 'user2_id_active';
const senderExitedAtField = (senderFieldToUpdate === 'user1_id_active') ? 'user1_exited_at' : 'user2_exited_at';

const receiverFieldToUpdate = (chatRoom.user1_id === senderId) ? 'user2_id_active' : 'user1_id_active';
const receiverExitedAtField = (receiverFieldToUpdate === 'user1_id_active') ? 'user1_exited_at' : 'user2_exited_at';

const isSenderUser1 = chatRoom.user1_id === senderId;
const isOpponentActive = isSenderUser1 ? chatRoomExit.user2_id_active : chatRoomExit.user1_id_active;

console.log(`[POST /message] isOpponentActive=${isOpponentActive}, chatRoomExit.user1_id_active=${chatRoomExit.user1_id_active}, chatRoomExit.user2_id_active=${chatRoomExit.user2_id_active}`);

if (!isOpponentActive) {
  const sortedIds = [chatRoom.user1_id, chatRoom.user2_id].sort((a, b) => a - b);

  if (socketMap[senderId]) {
    const senderSocketId = socketMap[senderId].socketId;
    io.to(senderSocketId).emit('chat_room_closed', {
      roomId: `chat-${sortedIds[0]}-${sortedIds[1]}`,
      message: '상대방이 채팅방을 나간 상태입니다. 채팅을 새로 시작해야 합니다.',
    });
    console.log(`[POST /message] chat_room_closed emit → senderId=${senderId}`);
  }
}

await ChatRoomExit.update(
  {
    [senderFieldToUpdate]: true,
    [senderExitedAtField]: null,
  },
  {
    where: { chat_rooms_id: roomsIdNum },
  }
);

    const roomId = `chat-${[chatRoom.user1_id, chatRoom.user2_id].sort((a, b) => a - b).join('-')}`;

    console.log(`[POST /message] senderId=${senderId}, chatRoom.user1_id=${chatRoom.user1_id}, chatRoom.user2_id=${chatRoom.user2_id}`);
    console.log(`[POST /message] senderId typeof=${typeof senderId}, senderId=${JSON.stringify(senderId)}`);



    const newMessage = await ChatMessage.create({
      sender_id: senderId,
      rooms_id: roomsIdNum,
      content,
    });
    console.log(`[POST /message] 메시지 DB 저장 완료: ID ${newMessage.id}`);

    const messageWithSender = await ChatMessage.findByPk(newMessage.id, {
      include: [{ model: User, attributes: ['id', 'nickname', 'profile_img'] }] 
    });
    console.log(`[POST /message] DB에서 저장된 메시지 (유저 정보 포함) 조회 완료.`);

    if (req.app.get('io')) {
  const io = req.app.get('io');
  const messagePayload = messageWithSender.toJSON();


  io.to(roomId).emit('receive_message', messagePayload);


  const receiverId = (chatRoom.user1_id === senderId) ? chatRoom.user2_id : chatRoom.user1_id;
}

    res.status(201).json(messageWithSender.toJSON());
    console.log(`[POST /message] 메시지 저장 및 응답 완료: ${newMessage.id}`);

  } catch (error) {
    console.error('❌ [POST /message] 메시지 전송 중 에러 발생:', error);
    next(error);
  }
});

router.get('/message/:roomId', isLoggedIn, async (req, res, next) => {
  try {
    const paramRoomId = req.params.roomId; 
    let roomIdAsNumber; 

    if (!paramRoomId || !paramRoomId.startsWith('chat-')) {
    console.log(`[GET /message/:roomId] 유효하지 않은 roomId 형식 또는 undefined: ${paramRoomId}`);
    return res.status(400).send('유효하지 않은 채팅방 ID 형식이야.');
}

    if (paramRoomId.startsWith('chat-')) {
        const parts = paramRoomId.split('-');
        if (parts.length === 3 && !isNaN(parseInt(parts[1])) && !isNaN(parseInt(parts[2]))) {
            const user1Id = parseInt(parts[1],10);
            const user2Id = parseInt(parts[2],10);

            if (user1Id === user2Id) {
                console.log(`[GET /message/:roomId] 유효하지 않은 roomId (자기 자신과의 채팅): ${paramRoomId}`);
                return res.status(400).send('유효하지 않은 채팅방 ID 형식이야.'); 
            }

            const sortedUser1Id = Math.min(user1Id, user2Id);
            const sortedUser2Id = Math.max(user1Id, user2Id);


            const chatRoomInDb = await ChatRoom.findOne({
                where: {
                    user1_id: sortedUser1Id,
                    user2_id: sortedUser2Id,
                },
                attributes: ['id'] 
            });

            if (chatRoomInDb) {
                roomIdAsNumber = chatRoomInDb.id;
                console.log(`[GET /message/:roomId] 클라이언트 roomId '${paramRoomId}' -> DB roomId ${roomIdAsNumber} 변환 완료.`); 
            } else {
                console.log(`[GET /message/:roomId] 클라이언트 roomId '${paramRoomId}'에 해당하는 DB 채팅방 없음.`); 
                return res.status(404).send('채팅방이 존재하지 않아.');
            }
        } else {
            console.log(`[GET /message/:roomId] 유효하지 않은 roomId 형식: ${paramRoomId}`); 
            return res.status(400).send('유효하지 않은 채팅방 ID 형식이야.');
        }
    } else {
        roomIdAsNumber = parseInt(paramRoomId, 10);
        if (isNaN(roomIdAsNumber)) {
             console.log(`[GET /message/:roomId] 유효하지 않은 숫자 roomId: ${paramRoomId}`); 
             return res.status(400).send('유효하지 않은 채팅방 ID 형식이야.');
        }
        console.log(`[GET /message/:roomId] 숫자 roomId 직접 사용: ${roomIdAsNumber}`); 
    }

    if (isNaN(roomIdAsNumber) || roomIdAsNumber === null) {
         console.log(`[GET /message/:roomId] 최종 roomIdAsNumber가 유효하지 않음: ${roomIdAsNumber}`);
         return res.status(400).send('채팅방 ID를 확인할 수 없어.');
     }

    const userId = req.user.id;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    console.log(`[GET /message/:roomId] 요청 수신: DB roomId=${roomIdAsNumber}, userId=${userId}`); 

    const chatRoom = await ChatRoom.findOne({ where: { id: roomIdAsNumber } }); 
    if (!chatRoom) {
      console.log(`[GET /message/:roomId] 채팅방 없음: ID ${roomIdAsNumber}`); 
      return res.status(404).send('채팅방이 존재하지 않아.');
    }
    if (chatRoom.user1_id !== userId && chatRoom.user2_id !== userId) {
      console.log(`[GET /message/:roomId] 권한 없음: userId=${userId}는 해당 채팅방에 참여하고 있지 않음.`); 
      return res.status(403).send('채팅방에 참여하고 있지 않아.');
    }

    console.log(`[GET /message/:roomId] 메시지 조회 시작: rooms_id=${roomIdAsNumber}`); 

    const chatRoomExit = await ChatRoomExit.findOne({
  where: { chat_rooms_id: roomIdAsNumber }
});

let exitedAt = null;
if (chatRoomExit) {
  if (chatRoom.user1_id === userId) {
    exitedAt = chatRoomExit.user1_exited_at;
  } else if (chatRoom.user2_id === userId) {
    exitedAt = chatRoomExit.user2_exited_at;
  }
}

const messageWhere = {
  rooms_id: roomIdAsNumber,
  is_deleted: false,
};

await ChatMessage.update(
  { is_read: true },
  {
    where: {
      rooms_id: roomIdAsNumber,
      sender_id: { [Op.ne]: userId },
      is_read: false,
    },
  }
);

console.log(`[GET /message/:roomId] 읽음 처리 완료.`);

const messages = await ChatMessage.findAll({
  where: messageWhere,
  include: [{ model: User, attributes: ['id', 'nickname','profile_img'] }],
  order: [['created_at', 'DESC']],
  limit,
  offset,
});
console.log(`[GET /message/:roomId] 최신 메시지 ${messages.length}개 조회 완료.`);

const readMessageIds = messages
  .filter(msg => msg.is_read === true && msg.sender_id !== userId)
  .map(msg => msg.id);


const senderUserId = (userId === chatRoom.user1_id) ? chatRoom.user2_id : chatRoom.user1_id;

if (socketMap && socketMap[senderUserId]) {
  const senderSocketId = socketMap[senderUserId].socketId;
  io.to(senderSocketId).emit('read_update', {
    roomId,
    readerId: userId,
    readMessageIds
  });
  console.log(`[GET /message/:roomId] read_update emit → senderUserId=${senderUserId}, readMessageIds=${readMessageIds}`);
} else {
  console.log(`[GET /message/:roomId] senderUserId=${senderUserId} 는 socketMap 에 없음 → read_update emit 안함`);
}
    console.log(`[GET /message/:roomId] 읽음 처리 완료. 응답 전송.`); 

    res.status(200).json(messages);

  } catch (error) {
    console.error('❌ [GET /api/chat/message/:roomId] 에러 발생:', error);
    next(error);
  }
});

router.patch('/message/:messageId/delete', isLoggedIn, async (req, res, next) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const userId = req.user.id;
    console.log(`[PATCH /message/:messageId/delete] 메시지 삭제 요청: messageId=${messageId}, userId=${userId}`);

    const message = await ChatMessage.findOne({ where: { id: messageId } });
    if (!message) {
      console.log(`[PATCH /message/:messageId/delete] 메시지 없음: ID ${messageId}`);
      return res.status(404).send('메시지가 존재하지 않아.');
    }

    if (message.sender_id !== userId) {
      console.log(`[PATCH /message/:messageId/delete] 권한 없음: senderId=${userId}는 해당 메시지를 보낸 사람이 아님.`);
      return res.status(403).send('메시지를 삭제할 권한이 없어.');
    }

    await ChatMessage.update(
      { is_deleted: true },
      { where: { id: messageId } }
    );
    console.log(`[PATCH /message/:messageId/delete] 메시지 삭제 처리 완료: ID ${messageId}`);

    res.status(200).json({ MessageId: messageId, is_deleted: true });
  } catch (error) {
    console.error('❌ [PATCH /message/:messageId/delete] 메시지 삭제 에러:', error);
    next(error);
  }
});

router.get('/unread', isLoggedIn, async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log(`[GET /unread] 전체 읽지 않은 메시지 카운트 요청: userId=${userId}`);

    const rooms = await ChatRoom.findAll({
      where: {
        [Op.or]: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      }
    });

    const result = await Promise.all(rooms.map(async (room) => {
      const opponentId = room.user1_id === userId ? room.user2_id : room.user1_id;

      const unreadCount = await ChatMessage.count({
        where: {
          rooms_id: room.id,
          sender_id: opponentId,
          is_read: false
        }
      });

      const sortedUserIds = [room.user1_id, room.user2_id].sort((a, b) => a - b);
      const roomIdForClient = `chat-${sortedUserIds[0]}-${sortedUserIds[1]}`;

      console.log(`[GET /unread] 채팅방 ${room.id} (클라이언트용 ID: ${roomIdForClient}) 읽지 않은 메시지: ${unreadCount}개`);

      return {
        roomId: roomIdForClient,
        opponentId,
        unreadCount
      };
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ [GET /unread] 전체 읽지 않은 메시지 카운트 에러:', error);
    next(error);
  }
});

router.get('/message/:roomId/unread', isLoggedIn, async (req, res, next) => {
  try {
    const roomId = parseInt(req.params.roomId, 10);
    const userId = req.user.id;
    console.log(`[GET /message/:roomId/unread] 특정 채팅방 읽지 않은 메시지 카운트 요청: roomId=${roomId}, userId=${userId}`);

    const chatRoom = await ChatRoom.findOne({ where: { id: roomId } });
    if (!chatRoom || (chatRoom.user1_id !== userId && chatRoom.user2_id !== userId)) {
      console.log(`[GET /message/:roomId/unread] 권한 없음 또는 채팅방 없음.`);
      return res.status(403).send('해당 채팅방의 읽지 않은 메시지를 조회할 권한이 없어.');
    }

    const unreadCount = await ChatMessage.count({
      where: {
        rooms_id: roomId,
        is_read: false,
        sender_id: { [Op.ne]: userId },
      },
    });
    console.log(`[GET /message/:roomId/unread] 채팅방 ${roomId} 읽지 않은 메시지: ${unreadCount}개`);
    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('❌ [GET /message/:roomId/unread] 특정 채팅방 읽지 않은 메시지 카운트 에러:', error);
    next(error);
  }
});

router.get('/my-rooms', isLoggedIn, async (req, res) => {
  const me = req.user.id;
  console.log(`[GET /my-rooms] 내 채팅방 목록 조회 요청: userId=${me}`);

  try {
    const rooms = await ChatRoom.findAll({
      where: {
        [Op.or]: [
          { user1_id: me },
          { user2_id: me }
        ]
      },
      include: [
    {
      model: ChatRoomExit,
      required: true, 
    }
  ]
    });
    console.log(`[GET /my-rooms] DB에서 ${rooms.length}개의 채팅방 기본 정보 조회.`);

    const filteredRooms = rooms.filter(room => {
  const exitInfo = room.ChatRoomExit;
  if (room.user1_id === me) {
    return exitInfo.user1_id_active === 1;
  } else {
    return exitInfo.user2_id_active === 1;
  }
});
console.log(`[GET /my-rooms] 필터링 후 ${filteredRooms.length}개의 채팅방 유지.`);

    const result = await Promise.all(filteredRooms.map(async (room) => {
      const isUser1 = room.user1_id === me;
      const partnerId = isUser1 ? room.user2_id : room.user1_id;

      const partner = await User.findOne({
        where: { id: partnerId },
        attributes: ['id', 'nickname', 'profile_img']
      });
      console.log(`[GET /my-rooms] 채팅방 ${room.id} 파트너 정보 조회 완료: ${partner ? partner.nickname : '없음'}`);


      const lastMsg = await ChatMessage.findOne({
        where: { rooms_id: room.id },
        order: [['created_at', 'DESC']],
      });
      console.log(`[GET /my-rooms] 채팅방 ${room.id} 마지막 메시지 조회 완료.`);

      const unreadCount = await ChatMessage.count({
        where: {
          rooms_id: room.id,
          sender_id: { [Op.ne]: me },
          is_read: false
        }
      });
      console.log(`[GET /my-rooms] 채팅방 ${room.id} 읽지 않은 메시지 카운트 완료: ${unreadCount}개`);

      return {
        roomId: `chat-${[room.user1_id, room.user2_id].sort().join('-')}`,
        chatRoomId: room.id,
        otherUser: {
          id: partner.id,
          nickname: partner.nickname,
          profileImage: partner.profile_img,
        },
        lastMessage: lastMsg ? lastMsg.content : '',
        lastMessageTime: lastMsg ? lastMsg.created_at : null,
        unreadCount
      };
    }));
    console.log(`[GET /my-rooms] 최종 채팅방 목록 ${result.length}개 반환.`);

    res.json(result);
  } catch (err) {
    console.error('❌ /my-rooms 에러:', err);
    res.status(500).send('서버 오류');
  }
});

module.exports = router;
