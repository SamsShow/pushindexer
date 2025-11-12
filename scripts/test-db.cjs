require("dotenv").config();
const pg = require("pg");

const { Pool } = pg;

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    ssl: process.env.DATABASE_URL.includes("neon.tech") ? {
      rejectUnauthorized: false,
    } : undefined,
  });

  try {
    console.log("Testing database connection...");
    const client = await pool.connect();
    console.log("✓ Connected successfully!");
    
    const result = await client.query("SELECT NOW() as current_time, version() as version");
    console.log("Current time:", result.rows[0].current_time);
    console.log("PostgreSQL version:", result.rows[0].version.split("\n")[0]);
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log("\nTables in database:");
    if (tablesResult.rows.length === 0) {
      console.log("  No tables found. You may need to run migrations.");
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }
    
    client.release();
    await pool.end();
    console.log("\n✓ Connection test completed successfully!");
  } catch (error) {
    console.error("✗ Connection failed:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

testConnection();

