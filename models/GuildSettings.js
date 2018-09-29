module.exports = (sequelize, DataTypes) => {
    return sequelize.define('GuildSettings', {
        guild_id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        wins: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
        update_name: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
        },
        update_icon: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
        },
        icon_style: {
            type: DataTypes.STRING,
            defaultValue: 'default',
            allowNull: false,
        },
        icon_background_url: {
            type: DataTypes.STRING,
            defaultValue: null,
            allowNull: true,
        },
        auto_update_wins: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        tracker_id: {
            type: DataTypes.STRING,
            defaultValue: null,
            allowNull: true,
        },
        premium: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
        },
    }, {
        timestamps: false,
    });
};