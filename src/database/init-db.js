require('dotenv').config()
const path = require('path')
const { Sequelize, DataTypes } = require('sequelize')

const DB_TYPE = process.env.DB_TYPE || 'sqlite'

let sequelize

if (DB_TYPE === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../db.sqlite'),
    logging: false
  })
} else {
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: DB_TYPE,
    logging: false
  })
}

const Violation = sequelize.define('Violation', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  guildId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  violationsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastViolationAt: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  indexes: [{ unique: true, fields: ['userId', 'guildId'] }]
})

async function initDB() {
  await sequelize.sync({ alter: true })
}

module.exports = {
  sequelize,
  Violation,
  initDB
}
