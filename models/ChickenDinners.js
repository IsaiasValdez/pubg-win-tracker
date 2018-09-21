module.exports = (sequelize, DataTypes) => {
    return sequelize.define('chickendinners', {
        match_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        image_url: {
            type: DataTypes.STRING,
            defaultValue: null,
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
        match_date: {
            type: DataTypes.DATE,
            allowNull: false,
        }
    }, {
        timestamps: false,
    });
};