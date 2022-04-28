import joi from 'joi';

const PartipantSchema = joi.object({
  name: joi.string().min(1).max(15).required(),
  lastStatus: joi.number(),
});

export default PartipantSchema;
