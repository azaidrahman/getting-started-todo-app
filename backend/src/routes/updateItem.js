const db = require('../persistence');
const { normalizeCategory } = require('../categories');

module.exports = async (req, res) => {
    await db.updateItem(req.params.id, {
        name: req.body.name,
        completed: req.body.completed,
        category: normalizeCategory(req.body.category),
    });
    const item = await db.getItem(req.params.id);
    res.send(item);
};
