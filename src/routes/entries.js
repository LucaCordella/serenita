const express = require('express');
const router = express.Router();
const db = require('../db'); // Importa o pool do PostgreSQL
const authenticateToken = require('../middleware/auth');

// Criar uma nova entrada (Create Entry)
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { type, data } = req.body;
  
  // Converte o objeto de dados para uma string JSON para armazenar no banco
  const dataStr = JSON.stringify(data || {});

  // Query SQL para inserir dados. No PostgreSQL usamos $1, $2, etc.
  const query = 'INSERT INTO entries (user_id, type, data) VALUES ($1, $2, $3) RETURNING id, created_at';
  
  try {
    // Executa a query passando os valores
    const result = await db.query(query, [userId, type, dataStr]);
    const newEntry = result.rows[0];
    
    // Retorna a entrada criada com sucesso
    res.status(201).json({ 
        id: newEntry.id, 
        user_id: userId, 
        type, 
        data: data, 
        created_at: newEntry.created_at 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

// Listar entradas (List Entries)
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { type } = req.query;

  let query = 'SELECT * FROM entries WHERE user_id = $1 ORDER BY created_at DESC';
  let params = [userId];

  // Se um tipo específico foi solicitado, filtra por ele
  if (type) {
    query = 'SELECT * FROM entries WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC';
    params = [userId, type];
  }

  try {
    const result = await db.query(query, params);
    // Converte a string JSON de volta para um objeto JavaScript
    const results = result.rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

// Atualizar uma entrada (Update Entry)
router.put('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const entryId = req.params.id;
  const { data } = req.body;

  if (!data) return res.status(400).json({ message: 'Dados ausentes' });
  const dataStr = JSON.stringify(data);

  const query = 'UPDATE entries SET data = $1 WHERE id = $2 AND user_id = $3';

  try {
    const result = await db.query(query, [dataStr, entryId, userId]);
    
    // Verifica se alguma linha foi afetada (se a entrada existia e pertencia ao usuário)
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Entrada não encontrada ou não autorizada' });
    }
    res.json({ message: 'Entrada atualizada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

// Deletar uma entrada (Delete Entry)
router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const entryId = req.params.id;

  const query = 'DELETE FROM entries WHERE id = $1 AND user_id = $2';

  try {
    const result = await db.query(query, [entryId, userId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Entrada não encontrada ou não autorizada' });
    }
    res.json({ message: 'Entrada deletada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

module.exports = router;