module.exports = (sequelize, DataTypes) => {
  const ChatRoomExit = sequelize.define('ChatRoomExit', {
    chat_rooms_id: { 
      type: DataTypes.BIGINT,
      primaryKey: true, 
      allowNull: false,
    },
    user1_id_active: {
      type: DataTypes.TINYINT(1), 
      allowNull: true,         
      defaultValue: 1,      
    },
    user2_id_active: {
      type: DataTypes.TINYINT(1), 
      allowNull: true,       
      defaultValue: 1,        
    },
    user1_exited_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    user2_exited_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'chat_room_exit', 
    timestamps: false, 
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
  });

  ChatRoomExit.associate = (db) => {
    db.ChatRoomExit.belongsTo(db.ChatRoom, {
      foreignKey: 'chat_rooms_id',
      targetKey: 'id', 
    });
  };

  return ChatRoomExit;
};
