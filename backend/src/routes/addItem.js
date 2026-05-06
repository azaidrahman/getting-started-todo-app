const db = require('../persistence');
const { v4: uuid } = require('uuid');
const { normalizeCategory } = require('../categories');

module.exports = async (req, res) => {
    const item = {
        id: uuid(),
        name: req.body.name,
        completed: false,
        category: normalizeCategory(req.body.category),
    };

    await db.storeItem(item);
    res.send(item);
};
