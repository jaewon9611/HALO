module.exports = (sequelize, DataTypes) => {
  const Advertisement = sequelize.define('Advertisement', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(100),
    },
    image_url: {
      type: DataTypes.TEXT,
    },
    target_url: {
      type: DataTypes.TEXT,
    },
    start_date: {
      type: DataTypes.DATE,
    },
    end_date: {
      type: DataTypes.DATE,
    },
    is_active: {
      type: DataTypes.TINYINT,
    },
  }, {
    tableName: 'advertisement',
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
  });

  return Advertisement;
};