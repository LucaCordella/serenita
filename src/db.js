const { Pool } = require('pg');
require('dotenv').config();

// Configuração da conexão.
// Em produção (no Render), usa a variável DATABASE_URL.
// Localmente, você precisará configurar essa variável no seu .env também.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('Banco de dados conectado com sucesso!');
});

// Função para criar tabelas (Schema)
// Adaptado para sintaxe PostgreSQL (SERIAL em vez de AUTOINCREMENT, TIMESTAMP, etc)
const createTables = async () => {
  const queryUsers = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      firstName TEXT,
      lastName TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      biography TEXT,
      birthDate TEXT,
      avatar TEXT,
      reminderTime TEXT DEFAULT '20:00',
      emergencyContact TEXT
    );
  `;

  const queryEntries = `
    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type TEXT,
      data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(queryUsers);
    await pool.query(queryEntries);
    console.log('Tabelas verificadas/criadas com sucesso.');
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  }
};

// Executa a criação de tabelas ao iniciar a conexão
createTables();

module.exports = pool;