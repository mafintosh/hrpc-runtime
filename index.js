const { EventEmitter } = require('events')
const fs = require('fs')
const net = require('net')

class HRPCServer extends EventEmitter {
  constructor (Session, onclient) {
    super()
    if (onclient) this.on('client', onclient)
    this.clients = new Set()
    this.server = net.createServer(rawSocket => {
      const client = new Session(rawSocket)
      this.clients.add(client)
      client.on('close', () => this.clients.delete(client))
      this.emit('client', client)
    })
    this.server.on('listening', () => this.emit('listening'))
    this.server.on('close', () => this.emit('close'))
    this.server.on('error', (err) => this.emit('error', err))
  }

  close () {
    return new Promise((resolve, reject) => {
      const done = (err) => {
        this.server.removeListener('error', done)
        this.server.removeListener('close', done)
        if (err) return reject(err)
        resolve()
      }

      this.server.on('close', done)
      this.server.on('error', done)

      this.server.close()
      for (const client of this.clients) client.destroy()
    })
  }

  listen (addr) {
    return new Promise((resolve, reject) => {
      const done = (err) => {
        this.server.removeListener('error', done)
        this.server.removeListener('listening', done)
        if (err) return reject(err)
        resolve()
      }

      this.server.on('error', done)
      this.server.on('listening', done)

      if (typeof addr === 'string') listenSocket(this.server, addr)
      else this.server.listen(addr)
    })
  }
}

module.exports = class HRPC extends EventEmitter {
  static createServer (onclient) {
    return new HRPCServer(this, onclient)
  }

  static connect (dest) {
    return new this(net.connect(dest))
  }
}

function listenSocket (server, name) {
  fs.unlink(name, () => {
    server.listen(name)
  })
}
