import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import qrcode from 'qrcode'
import { useMultiFileAuthState, makeWASocket } from '@whiskeysockets/baileys'
import fs from 'fs'
import JSZip from 'jszip'
import path from 'path'

const app = express()
app.use(cors())
app.use(bodyParser.json())

const PORT = process.env.PORT || 3000
const sockets = {}

app.get('/', (_, res) => res.send('✅ Nexty Session Generator API is running.'))

app.post('/start', async (req, res) => {
  try {
    const clientId = req.body.clientId || Date.now().toString()
    const sessionPath = `./sessions/${clientId}`
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false
    })

    sockets[clientId] = { sock, sessionPath }

    sock.ev.on('connection.update', async (update) => {
      if (update.qr) {
        const qrImg = await qrcode.toDataURL(update.qr)
        sockets[clientId].lastQr = qrImg
      }
      if (update.connection === 'open') {
        const zip = new JSZip()
        const files = listFiles(sessionPath)
        for (const f of files) {
          const rel = f.replace(sessionPath + '/', '')
          zip.file(rel, fs.readFileSync(f))
        }
        const base64 = (await zip.generateAsync({ type: 'base64' }))
        const sessionID = `Nexty~${base64}`
        sockets[clientId].sessionID = sessionID
      }
    })

    res.json({ ok: true, clientId })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/qr', (req, res) => {
  const { clientId } = req.query
  const qr = sockets[clientId]?.lastQr || null
  res.json({ qr })
})

app.get('/session', (req, res) => {
  const { clientId } = req.query
  const session = sockets[clientId]?.sessionID || null
  res.json({ session })
})

function listFiles(dir) {
  let files = []
  try {
    fs.readdirSync(dir).forEach((f) => {
      const p = path.join(dir, f)
      if (fs.statSync(p).isDirectory()) files = files.concat(listFiles(p))
      else files.push(p)
    })
  } catch {}
  return files
}

app.listen(PORT, () => console.log(`🚀 Nexty Session Generator running on port ${PORT}`))
