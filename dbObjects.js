const Sequelize = require('sequelize');
const DATABASE_URL = process.env.DATABASE_URL;

const { useSqlite } = require('./config.json');

let sequelize = null;

if (!useSqlite) {
    sequelize = new Sequelize(DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        operatorsAliases: false,
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
        // sqlite only
        storage: 'db.sqlite',
    });
}

const GuildSettings = sequelize.import('models/GuildSettings');
const AccountConnections = sequelize.import('models/AccountConnections');
const MatchStats = sequelize.import('models/MatchStats');
const UserMatches = sequelize.import('models/UserMatches');

module.exports = { GuildSettings, AccountConnections, MatchStats, UserMatches };