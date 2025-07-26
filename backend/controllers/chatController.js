const { ChatRoom, ChatMessage, Sequelize } = require('../models');

exports.getUnreadMessages = async (req, res) => {
  const userId = parseInt(req.query.userId, 10);

  const rooms = await ChatRoom.findAll({
    where: {
      [Sequelize.Op.or]: [
        { user1_id: userId },
        { user2_id: userId }
      ]
    }
  });

  const result = [];

  for (const room of rooms) {
    const opponentId = room.user1_id === userId ? room.user2_id : room.user1_id;

    const unreadCount = await ChatMessage.count({
      where: {
        rooms_id: room.id,
        sender_id: opponentId,
        is_read: false
      }
    });

    result.push({
      roomId: `chat-${[userId, opponentId].sort((a, b) => a - b).join('-')}`,
      opponentId,
      unreadCount
    });
  }

  res.json(result);
};
