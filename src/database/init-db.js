require('dotenv').config()
const mongoose = require('mongoose')

const localDbName = 'volume-moderation'
const defaultLocalUri = `mongodb://127.0.0.1:27017/${localDbName}`

const uri = process.env.MONGO_URI || defaultLocalUri

const violationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  guildId: {
    type: String,
    required: true
  },
  violationsCount: {
    type: Number,
    default: 0
  },
  lastViolationAt: {
    type: Date,
    default: Date.now
  }
})

violationSchema.index({ userId: 1, guildId: 1 }, { unique: true })

const Violation = mongoose.model('Violation', violationSchema)

/**
 * Initializes a MongoDB connection using MONGO_URI from .env if provided,
 * otherwise defaults to mongodb://127.0.0.1:27017/volume-moderation
 */
async function initDB() {
  await mongoose.connect(uri, {})
}

module.exports = {
  Violation,
  initDB
}
