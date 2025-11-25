import 'dotenv/config'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
	console.error('DATABASE_URL is not defined. Create a local .env file or set DATABASE_URL in your environment.')
}

const sql = postgres(connectionString)

export default sql
