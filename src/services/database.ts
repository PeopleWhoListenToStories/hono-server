import { Pool } from 'pg'
import { ENV } from '../config/env'

export class DatabaseService {
  private pool = new Pool({ connectionString: ENV.DATABASE_URL })

  async query(sql: string, params: any[] = []) {
    const client = await this.pool.connect()
    try {
      const res = await client.query(sql, params)
      return res.rows
    } finally {
      client.release()
    }
  }
}
