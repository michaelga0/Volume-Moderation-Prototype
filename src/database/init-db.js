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

const Violation = sequelize.define('violation', {
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  guild_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  violations_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_violation_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  punishment_status: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  exempt: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'violation',
  indexes: [{ unique: true, fields: ['user_id', 'guild_id'] }]
})

const ServerSettings = sequelize.define('server_settings', {
  guild_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mute_threshold: {
    type: DataTypes.INTEGER,
    defaultValue: 5
  },
  timeout_threshold: {
    type: DataTypes.INTEGER,
    defaultValue: 7
  },
  kick_threshold: {
    type: DataTypes.INTEGER,
    defaultValue: 9
  },
  timeout_duration: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  mute_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  timeout_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  kick_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  violation_reset_days: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  violation_reset_hours: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  violation_reset_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  violation_reset_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'server_settings',
  indexes: [{ unique: true, fields: ['guild_id'] }]
})

async function initDB() {
  await sequelize.sync({ alter: true })
}

module.exports = {
  sequelize,
  Violation,
  ServerSettings,
  initDB
}
