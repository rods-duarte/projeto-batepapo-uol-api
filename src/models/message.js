import joi from 'joi';

const MessageSchema = joi.object({
  from: joi.string().required(),
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().required(),
  time: joi.string().required(),
});

export default MessageSchema;
