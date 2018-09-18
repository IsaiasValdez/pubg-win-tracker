module.exports = (sequelize, DataTypes) => {
    return sequelize.define('matchstats', {
        match_id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        image_url: {
            type: DataTypes.STRING,
            defaultValue: 'none',
            allowNull: true,
        },
        player_1: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        player_2: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        player_3: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        player_4: {
            type: DataTypes.JSON,
            allowNull: true,
        },
    }, {
        timestamps: false,
    });
};