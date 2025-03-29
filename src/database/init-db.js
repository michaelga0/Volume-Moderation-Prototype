require('dotenv').config()
const path = require('path')
const { Sequelize, DataTypes } = require('sequelize')
const { DEFAULT_MUTE_THRESHOLD, DEFAULT_TIMEOUT_THRESHOLD, DEFAULT_KICK_THRESHOLD } = require('../utils/constants')

let sequelize

if (
  process.env.DB_HOST &&
  process.env.DB_NAME &&
  process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_TYPE
) {
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: process.env.DB_TYPE,
    logging: false
  })
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../db.sqlite'),
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
  // Make this unique when sequelize fixes this or switching off sqlite3
  indexes: [{ fields: ['user_id', 'guild_id'] }]
})

const ServerSettings = sequelize.define('server_settings', {
  guild_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mute_threshold: {
    type: DataTypes.INTEGER,
    defaultValue: DEFAULT_MUTE_THRESHOLD
  },
  timeout_threshold: {
    type: DataTypes.INTEGER,
    defaultValue: DEFAULT_TIMEOUT_THRESHOLD
  },
  kick_threshold: {
    type: DataTypes.INTEGER,
    defaultValue: DEFAULT_KICK_THRESHOLD
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
  },
  volume_sensitivity: {
    type: DataTypes.DECIMAL(3, 0),
    allowNull: false,
    defaultValue: 50,
    validate: {
      min: 0,
      max: 100
    }
  }
}, {
  tableName: 'server_settings',
  indexes: [{ unique: true, fields: ['guild_id'] }]
})

async function initDB() {
  // Remove this on prod
  await sequelize.sync({ alter: true })
}

module.exports = {
  sequelize,
  Violation,
  ServerSettings,
  initDB
}
