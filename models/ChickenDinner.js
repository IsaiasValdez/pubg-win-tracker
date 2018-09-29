module.exports = (sequelize, DataTypes) => {
    return sequelize.define('ChickenDinner', {
        guild_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        match_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        image_url: {
            type: DataTypes.STRING,
            defaultValue: null,
            allowNull: true,
        },
        total_kills: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
        players: {
            type: DataTypes.JSON,
            allowNull: false,
        },
    }, {
        timestamps: false,
    });
};