const fs = require('fs')
const path = require('path')

// Set this to true to enable console logs instead of file logs
const DEVELOPER_MODE = false

const LOGS_DIR = path.join(__dirname, '../../logs')
const MAX_LINES_PER_FILE = 10000

let currentLogFile = ''
let linesWritten = 0
let logStream = null

function initNewLogFile() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true })
  }
  currentLogFile = `${Date.now()}.log`
  logStream = fs.createWriteStream(path.join(LOGS_DIR, currentLogFile), { flags: 'a' })
  linesWritten = 0
}

function writeLog(message) {
  if (DEVELOPER_MODE) {
    // If dev mode is on, log to console instead of file
    console.log(message)
    return
  }
  if (!logStream) {
    initNewLogFile()
  }
  const timestamp = new Date().toISOString()
  logStream.write(`[${timestamp}] ${message}\n`)
  linesWritten++
  if (linesWritten >= MAX_LINES_PER_FILE) {
    logStream.end()
    initNewLogFile()
  }
}

module.exports = { writeLog }
