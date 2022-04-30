import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
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
  console.log('\nConectado ao banco de dados');
})();

isActive(dbName);

app.get('/participants', async (req, res) => {
  try {
    const participants = await db.collection('participants').find().toArray();
    res.send(participants);
  } catch (e) {
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
    console.log(e);
    res.sendStatus(500);
  }
});

app.post('/participants', async (req, res) => {
  const { body } = req;
  const time = Date.now();

  if (ParticipantSchema.validate(body).error) {
    res.sendStatus(422);
    return;
  }

  try {
    const checkExists = await db
      .collection('participants')
      .count({ ...body }, { limit: 1 });

    if (checkExists) {
      res.sendStatus(409);
      return;
    }

    await db
      .collection('participants')
      .insertOne({ ...body, lastStatus: time });
    await db.collection('messages').insertOne({
      from: body.name,
      to: 'Todos',
      text: 'entra na sala...',
      type: 'status',
      time: dayjs(time).format('HH:mm:ss'),
    });
    res.sendStatus(201);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
    res.sendStatus(500);
  }
});

app.post('/messages', async (req, res) => {
  const { body, headers } = req;
  const message = {
    from: headers.user,
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

// eslint-disable-next-line no-console
app.listen(process.env.PORT || 5000, () => console.log('\nServer aberto'));
