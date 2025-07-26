module.exports = (sequelize,DataTypes)=>{

  const Image = sequelize.define('Image',{
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    post_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },        
    src:{
      type : DataTypes.STRING(200),
      allowNull:false
    }
  },{
    charset:'utf8',
    collate:'utf8_general_ci'
  }); 

  Image.associate = (db)=>{
    db.Image.belongsTo(db.Post, { foreignKey: 'post_id',  onDelete: 'CASCADE',onUpdate: 'CASCADE', });
  };
  return Image;
};