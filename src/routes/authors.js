const express = require('express');
const db = require('../../db/database');

const router = express.Router();

// GET /authors
// Return all authors.
router.get('/', (req, res) => {
  const authors = db.prepare('SELECT * FROM authors').all();
  res.status(200).json(authors);
});

// GET /authors/:id
// Return a single author. 404 if not found.
router.get('/:id', (req, res) => {
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(req.params.id);

  if (!author) {
    return res.status(404).json({ error: 'Author not found' });
  }

  res.status(200).json(author);
});

// POST /authors
// Create a new author. Body: { name, bio? }
// Respond 201 with the created author.
router.post('/', (req, res) => {
  const { name, bio } = req.body;
  const result = db.prepare('INSERT INTO authors (name, bio) VALUES (?, ?)').run(name, bio);
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json(author);
});

// PATCH /authors/:id
// Update name and/or bio. Body: { name?, bio? }
// Respond 200 with the updated author. 404 if not found.
router.patch('/:id', (req, res) => {
  const { name, bio } = req.body;
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(req.params.id);

  if (!author) {
    return res.status(404).json({ error: 'Author not found' });
  }

  db.prepare('UPDATE authors SET name = ?, bio = ? WHERE id = ?')
    .run(name ?? author.name, bio ?? author.bio, req.params.id);

  const updatedAuthor = db.prepare('SELECT * FROM authors WHERE id = ?').get(req.params.id);
  res.status(200).json(updatedAuthor);
});

// DELETE /authors/:id
// Delete an author and their books (cascade). 204 on success. 404 if not found.
router.delete('/:id', (req, res) => {
  const author = db.prepare('SELECT id FROM authors WHERE id = ?').get(req.params.id);

  if (!author) {
    return res.status(404).json({ error: 'Author not found' });
  }

  db.prepare('DELETE FROM authors WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

// GET /authors/:id/books
// Return all books by this author. 404 if author not found.
router.get('/:id/books', (req, res) => {
  const author = db.prepare('SELECT id FROM authors WHERE id = ?').get(req.params.id);

  if (!author) {
    return res.status(404).json({ error: 'Author not found' });
  }

  const books = db.prepare('SELECT * FROM books WHERE author_id = ?').all(req.params.id);
  res.status(200).json(books);
});

module.exports = router;
