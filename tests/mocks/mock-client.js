const { EventEmitter } = require('events')

class MockClient extends EventEmitter {
  constructor() {
    super()
    this.commands = new Map()
  }

  login() {
    return Promise.resolve()
  }
}

module.exports = {
  MockClient
}
