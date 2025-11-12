// src/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '..', 'data', 'database.sqlite');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao abrir DB', err);
    process.exit(1);
  } else {
    console.log('Banco de dados conectado com sucesso em', dbPath);
  }
});

db.serialize(() => {
  // Tabela de usuários (Schema original)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // Tabela de entradas (Schema original)
  db.run(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT,
      data TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // --- ATUALIZAÇÃO DO SCHEMA DE 'users' ---
  // Função auxiliar para adicionar colunas de forma segura (evita erros se já existirem)
  const addColumnIfNotExists = (columnDefinition) => {
    const columnName = columnDefinition.split(' ')[0];
    db.all(`PRAGMA table_info(users)`, (err, columns) => {
      if (err) {
        console.error('Erro ao verificar colunas da tabela "users":', err);
        return;
      }
      const columnExists = columns.some(col => col.name === columnName);
      if (!columnExists) {
        db.run(`ALTER TABLE users ADD COLUMN ${columnDefinition}`, (alterErr) => {
          if (alterErr) {
            console.error(`Erro ao adicionar coluna ${columnName}:`, alterErr);
          } else {
            console.log(`Coluna ${columnName} adicionada à tabela "users".`);
          }
        });
      }
    });
  };

  // Adicionando novas colunas para Perfil e Configurações
  addColumnIfNotExists('biography TEXT'); // Para a bio do perfil
  addColumnIfNotExists('birthDate TEXT'); // Para calcular idade
  addColumnIfNotExists('avatar TEXT'); // Para salvar imagem em base64
  addColumnIfNotExists('reminderTime TEXT DEFAULT "20:00"'); // Para lembretes
  addColumnIfNotExists('emergencyContact TEXT'); // Para contato de emergência (JSON)
});

module.exports = db;