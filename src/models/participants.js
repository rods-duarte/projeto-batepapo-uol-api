import joi from 'joi';

const ParticipantSchema = joi.object({
  name: joi.string().min(1).required(),
  lastStatus: joi.number(),
});

export default ParticipantSchema;
