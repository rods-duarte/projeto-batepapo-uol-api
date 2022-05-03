import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import { stripHtml } from 'string-strip-html'; //eslint-disable-line
import dotenv from 'dotenv';
import dayjs from 'dayjs';

import isActive from './is_user_active.js';

import MessageSchema from './models/message.js';
import ParticipantSchema from './models/participants.js';

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

const client = new MongoClient(process.env.MONGO_URL);
const dbName = process.env.DATABASE_NAME;
let db;

// eslint-disable-next-line func-names
(async function () {
  await client.connect();
  db = client.db(dbName);
  // eslint-disable-next-line no-console
  console.log('\nConectado ao banco de dados');
})();

isActive(dbName);

app.get('/participants', async (req, res) => {
  try {
    const participants = await db.collection('participants').find().toArray();
    res.send(participants);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
    res.sendStatus(500);
  }
});

app.get('/messages', async (req, res) => {
  let { limit } = req.query;
  const { user } = req.headers;

  try {
    const messages = await db
      .collection('messages')
      .find({
        $or: [
          { from: user },
          { to: user },
          { to: 'Todos' },
          { type: 'message' },
        ],
      })
      .toArray();
    if (!limit || limit <= 0) limit = messages.length;
    res.send(messages.splice(messages.length - limit, messages.length));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
    res.sendStatus(500);
  }
});

app.post('/participants', async (req, res) => {
  let { name } = req.body;
  const time = Date.now();
  name = stripHtml(name).result.trim();

  if (ParticipantSchema.validate({ name }).error) {
    res.sendStatus(422);
    return;
  }

  try {
    const checkExists = await db
      .collection('participants')
      .count({ name }, { limit: 1 });

    if (checkExists) {
      res.sendStatus(409);
      return;
    }

    await db.collection('participants').insertOne({ name, lastStatus: time });
    await db.collection('messages').insertOne({
      from: name,
      to: 'Todos',
      text: 'entra na sala...',
      type: 'status',
      time: dayjs(time).format('HH:mm:ss'),
    });
    res.status(201).send({ name });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
    res.sendStatus(500);
  }
});

app.post('/messages', async (req, res) => {
  const { body, headers } = req;
  const message = {
    from: stripHtml(headers.user).result.trim(),
    to: body.to,
    text: body.text,
    type: body.type,
    time: dayjs().format('HH:mm:ss'),
  };

  if (MessageSchema.validate(message).error) {
    res.sendStatus(422);
    return;
  }

  try {
    const checkExists = await db
      .collection('participants')
      .count({ name: message.from }, { limit: 1 });

    if (!checkExists) {
      res.sendStatus(422);
      return;
    }

    await db.collection('messages').insertOne(message);
    res.sendStatus(201);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
    res.sendStatus(500);
  }
});

app.post('/status', async (req, res) => {
  const { headers } = req;

  try {
    const checkExists = await db
      .collection('participants')
      .count({ name: headers.user }, { limit: 1 });

    if (!checkExists) {
      res.sendStatus(404);
      return;
    }

    await db
      .collection('participants')
      .updateOne({ name: headers.user }, { $set: { lastStatus: Date.now() } });
    res.sendStatus(200);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
    res.sendStatus(500);
  }
});

app.delete('/messages/:id', async (req, res) => {
  const { user } = req.headers;
  const { id } = req.params;
  try {
    const deleteMessage = await db
      .collection('messages')
      .findOne({ _id: ObjectId(id) });

    if (!deleteMessage) {
      res.sendStatus(404);
      return;
    }

    if (deleteMessage.from !== user) {
      res.sendStatus(401);
      return;
    }

    await db.collection('messages').deleteOne(deleteMessage);

    res.sendStatus(200);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
    res.sendStatus(500);
  }
});

// eslint-disable-next-line no-console
app.listen(process.env.PORT || 5000, () => console.log('\nServer aberto'));
