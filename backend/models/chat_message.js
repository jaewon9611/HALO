module.exports = (sequelize, DataTypes) => {
  const ChatMessage = sequelize.define('ChatMessage', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    sender_id: {
      type: DataTypes.BIGINT,
      allowNull: false,       
    },
    rooms_id: {
      type: DataTypes.BIGINT,
      allowNull: false,       
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,       
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,      
      allowNull: false,       
    },
    is_read: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
    },
    is_deleted: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
    },
  }, {
    tableName: 'chat_messages',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
  });

  ChatMessage.associate = (db) => {
    db.ChatMessage.belongsTo(db.User, { foreignKey: 'sender_id' });
    db.ChatMessage.belongsTo(db.ChatRoom, { foreignKey: 'rooms_id' });
  };

  return ChatMessage;
};