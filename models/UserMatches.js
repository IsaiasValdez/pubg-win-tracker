module.exports = (sequelize, DataTypes) => {
    return sequelize.define('usermatches', {
        account_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        dinner_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    }, {
        timestamps: false,
    });
};