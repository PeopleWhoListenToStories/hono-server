import { Server, onAuthenticatePayload, onChangePayload, onLoadDocumentPayload } from '@hocuspocus/server'
import * as Y from 'yjs'
import { TiptapTransformer } from '@hocuspocus/transformer'
import lodash from 'lodash'
import { DatabaseService } from './database'
import { decryptCollabToken } from '../utils/crypto.helpers'
import { ENV } from '../config/env'
import { logger } from '../utils/logger.helpers'

export class CollaborationService {
  private server!: Server
  private db = new DatabaseService()
  private timers = new Map<string, NodeJS.Timeout>()
  private debounceTime = 1000

  constructor() {
    this.initServer()
  }

  private debounce(id: string, func: () => void) {
    if (this.timers.has(id)) clearTimeout(this.timers.get(id)!)
    this.timers.set(
      id,
      setTimeout(() => {
        func()
        this.timers.delete(id)
      }, this.debounceTime),
    )
  }

  private async initServer() {
    this.server = Server.configure({
      port: ENV.WS_PORT,
      quiet: true,
      onAuthenticate: this.onAuthenticate.bind(this),
      onLoadDocument: this.onLoadDocument.bind(this),
      onChange: this.onChange.bind(this),
      onDisconnect: this.onDisconnect.bind(this),
    })

    await this.server.listen(ENV.WS_PORT)
    logger.success(`Hocuspocus WS started at ws://localhost:${ENV.WS_PORT}`)
  }

  private async onAuthenticate({ token }: onAuthenticatePayload) {
    if (!token) throw new Error('Missing token')
    const user = decryptCollabToken(token)
    if (!user) throw new Error('Invalid token')
    logger.info('Authenticated user:', user.userId)
    return { user: { id: user.userId } }
  }

  private async onLoadDocument({ requestParameters }: onLoadDocumentPayload) {
    const name = requestParameters.get('name')
    if (!name) throw new Error('Missing document name')

    const rows = await this.db.query(`SELECT "content" FROM "Doc" WHERE "id" = $1 LIMIT 1`, [name])
    const ydoc = new Y.Doc()

    if (rows.length && rows[0].content) {
      const bytes = Uint8Array.from(Buffer.from(rows[0].content, 'base64'))
      Y.applyUpdate(ydoc, bytes)
    }
    logger.info('Loaded document:', name)
    return ydoc
  }

  private async onChange({ documentName, document }: onChangePayload) {
    if (!(document instanceof Y.Doc)) return
    this.debounce(documentName, async () => {
      const content = Buffer.from(Y.encodeStateAsUpdate(document)).toString('base64')
      await this.db.query(`UPDATE "Doc" SET "content" = $1, "updatedAt" = NOW() WHERE "id" = $2`, [
        content,
        documentName,
      ])
      logger.info('Saved document:', documentName)
    })
  }

  private async onDisconnect({ requestParameters }: any) {
    logger.warn('Disconnected document:', requestParameters.get('name'))
  }
}
