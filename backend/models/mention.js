module.exports = (sequelize, DataTypes) => {
  const Mention = sequelize.define('Mention', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    senders_id: {
      type: DataTypes.BIGINT,
      allowNull: false,      
    },
    receiver_id: {
      type: DataTypes.BIGINT,
      allowNull: false,      
    },
    target_type: {
      type: DataTypes.ENUM('POST', 'COMMENT', 'USER'),
    },
       target_id: {        
     type: DataTypes.BIGINT,
     allowNull: false,         
   },
    context: {
      type: DataTypes.TEXT,
    },
    createAt: {
      type: DataTypes.DATE,
      allowNull: false,      
      defaultValue: DataTypes.NOW,      
    },
  }, {
    tableName: 'mention',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
  });

  Mention.associate = (db) => {
    db.Mention.belongsTo(db.User, { 
      foreignKey: 'senders_id', 
    });
    db.Mention.belongsTo(db.User, { 
      foreignKey: 'receiver_id',
    });
  };

  return Mention;
};