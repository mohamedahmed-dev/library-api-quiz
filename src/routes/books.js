const express = require('express');
const db = require('../../db/database');

const router = express.Router();

// GET /books
// Return all books. Optional query param: ?author_id=<id>
router.get('/', (req, res) => {
  const { author_id } = req.query;
  const sql = `
    SELECT
      books.id AS book_id,
      books.title,
      books.year,
      authors.id AS author_id,
      authors.name AS author_name,
      authors.bio AS author_bio
    FROM books
    JOIN authors ON books.author_id = authors.id
    ${author_id ? 'WHERE books.author_id = ?' : ''}`;

  const rows = author_id
    ? db.prepare(sql).all(author_id)
    : db.prepare(sql).all();

  const books = rows.map((row) => ({
    id: row.book_id,
    title: row.title,
    year: row.year,
    author: {
      id: row.author_id,
      name: row.author_name,
      bio: row.author_bio,
    },
  }));

  res.status(200).json(books);
});

// GET /books/:id
// Return a single book including its author info. 404 if not found.
router.get('/:id', (req, res) => {
  const row = db.prepare(
    `SELECT
       books.id AS book_id,
       books.title,
       books.year,
       authors.id AS author_id,
       authors.name AS author_name,
       authors.bio AS author_bio
     FROM books
     JOIN authors ON books.author_id = authors.id
     WHERE books.id = ?`
  ).get(req.params.id);

  if (!row) {
    return res.status(404).json({ error: 'Book not found' });
  }

  res.status(200).json({
    id: row.book_id,
    title: row.title,
    year: row.year,
    author: {
      id: row.author_id,
      name: row.author_name,
      bio: row.author_bio,
    },
  });
});

// POST /books
// Create a new book. Body: { title, year?, author_id }
// Respond 201 with the created book. 404 if author_id does not exist.
router.post('/', (req, res) => {
  const { title, year, author_id } = req.body;
  const author = db.prepare('SELECT id FROM authors WHERE id = ?').get(author_id);

  if (!author) {
    return res.status(404).json({ error: 'Author not found' });
  }

  const result = db.prepare(
    'INSERT INTO books (title, year, author_id) VALUES (?, ?, ?)'
  ).run(title, year, author_id);

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(book);
});

// PATCH /books/:id
// Update title, year, or author_id. Body: { title?, year?, author_id? }
// Respond 200 with the updated book. 404 if not found.
router.patch('/:id', (req, res) => {
  const { title, year, author_id } = req.body;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  if (author_id !== undefined && author_id !== book.author_id) {
    const author = db.prepare('SELECT id FROM authors WHERE id = ?').get(author_id);
    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }
  }

  db.prepare('UPDATE books SET title = ?, year = ?, author_id = ? WHERE id = ?')
    .run(title ?? book.title, year ?? book.year, author_id ?? book.author_id, req.params.id);

  const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  res.status(200).json(updatedBook);
});

// DELETE /books/:id
// Delete a book. 204 on success. 404 if not found.
router.delete('/:id', (req, res) => {
  const book = db.prepare('SELECT id FROM books WHERE id = ?').get(req.params.id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

module.exports = router;
