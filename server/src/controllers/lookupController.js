const db = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

function crudFor(Model, fields) {
  return {
    list: catchAsync(async (req, res) => {
      const records = await Model.findAll({ order: [['name', 'ASC']] });
      res.json({ [Model.name.toLowerCase() + 's']: records });
    }),
    create: catchAsync(async (req, res) => {
      const payload = {};
      for (const f of fields) payload[f] = req.body[f];
      if (!payload.name) throw new ApiError(400, 'name is required');
      const record = await Model.create(payload);
      res.status(201).json({ [Model.name.toLowerCase()]: record });
    }),
    update: catchAsync(async (req, res) => {
      const record = await Model.findByPk(req.params.id);
      if (!record) throw new ApiError(404, `${Model.name} not found`);
      for (const f of fields) if (req.body[f] !== undefined) record[f] = req.body[f];
      await record.save();
      res.json({ [Model.name.toLowerCase()]: record });
    }),
    remove: catchAsync(async (req, res) => {
      const record = await Model.findByPk(req.params.id);
      if (!record) throw new ApiError(404, `${Model.name} not found`);
      await record.destroy();
      res.json({ success: true });
    }),
  };
}

module.exports = {
  brands: crudFor(db.Brand, ['name']),
  units: crudFor(db.Unit, ['name', 'abbreviation']),
};
