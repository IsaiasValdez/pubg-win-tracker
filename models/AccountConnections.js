module.exports = (sequelize, DataTypes) => {
    return sequelize.define('accountconnections', {
        guild_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        discord_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        pubg_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        timestamps: false,
    });
};