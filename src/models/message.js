import joi from 'joi';

const MessageSchema = joi.object({
  from: joi.string().required(),
  to: joi.string().min(1).required(),
  text: joi.string().min(1).required(),
  type: joi.string().valid('private_message', 'message').required(),
  time: joi.string().required(),
});

export default MessageSchema;
