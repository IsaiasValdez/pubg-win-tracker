module.exports = (sequelize, DataTypes) => {
    return sequelize.define('usermatches', {
        discord_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        match_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        timestamps: false,
    });
};