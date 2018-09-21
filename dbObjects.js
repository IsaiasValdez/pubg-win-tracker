const Sequelize = require('sequelize');
const DATABASE_URL = process.env.DATABASE_URL;

const { useSqlite } = require('./config.json');

let sequelize = null;

if (!useSqlite) {
    sequelize = new Sequelize(DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        operatorsAliases: false,
        define: {
            freezeTableName: true,
        },
        dialectOptions: {
            ssl: true,
        },
        pool: {
            max: 20,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    });
}
else {
    sequelize = new Sequelize('database', 'user', 'password', {
        host: 'localhost',
        dialect: 'sqlite',
        logging: true,
        operatorsAliases: false,
        define: {
            freezeTableName: true,
        },
        // sqlite only
        storage: 'db.sqlite',
    });
}

const GuildSettings = sequelize.import('models/GuildSettings');
const User = sequelize.import('models/User');
const ChickenDinner = sequelize.import('models/ChickenDinner');

// set association between User table and ChickenDinner table
User.belongsToMany(ChickenDinner, { through: 'UserDinners', foreignKey: 'user_id' });
ChickenDinner.belongsToMany(User, { through: 'UserDinners', foreignKey: 'dinner_id' });

module.exports = { GuildSettings, User, ChickenDinner };