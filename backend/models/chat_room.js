module.exports = (sequelize, DataTypes) => {
  const ChatRoom = sequelize.define('ChatRoom', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    user1_id: {
      type: DataTypes.BIGINT,
      allowNull: false,      
    },
    user2_id: {
      type: DataTypes.BIGINT,
      allowNull: false,      
    },
  }, {
    tableName: 'chat_rooms',
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
  });

  ChatRoom.associate = (db) => {
    db.ChatRoom.belongsTo(db.User, { foreignKey: 'user1_id', as: 'User1' });
    db.ChatRoom.belongsTo(db.User, { foreignKey: 'user2_id', as: 'User2' });

    db.ChatRoom.hasMany(db.ChatMessage, {
      foreignKey: 'rooms_id',
      sourceKey: 'id',
    });

    db.ChatRoom.hasOne(db.ChatRoomExit, {
      foreignKey: 'chat_rooms_id',
    });
  };

  return ChatRoom;
};