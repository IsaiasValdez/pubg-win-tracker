module.exports = (sequelize, DataTypes) => {
    return sequelize.define('User', {
        discord_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        pubg_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        pubg_name:  {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        timestamps: false,
    });
};