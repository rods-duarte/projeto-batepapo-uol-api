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

const dbName = 'batepapo-uol-api';

app.post('/participants', async (req, res) => {
  const client = new MongoClient(process.env.MONGO_URL);
  const { body } = req;
  const time = Date.now();

  if (ParticipantSchema.validate(body).error) {
    res.sendStatus(422);
    return;
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const checkExists = await db
      .collection('participants')
      .findOne({ ...body });

    if (checkExists) {
      res.sendStatus(409);
      client.close();
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
  } finally {
    client.close();
  }
});

app.post('/messages', async (req, res) => {
  const client = new MongoClient(process.env.MONGO_URL);
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
    await client.connect();
    const db = client.db(dbName);
    const checkExists = await db
      .collection('participants')
      .findOne({ name: message.from });

    if (!checkExists) {
      client.close();
      res.sendStatus(422);
      return;
    }

    await db.collection('messages').insertOne(message);
    res.sendStatus(201);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
    res.sendStatus(500);
  } finally {
    client.close();
  }
});

app.post('/status', async (req, res) => {
  const client = new MongoClient(process.env.MONGO_URL);
  const { headers } = req;

  try {
    await client.connect();
    const db = client.db(dbName);
    const checkExists = await db
      .collection('participants')
      .findOne({ name: headers.user });

    if (!checkExists) {
      client.close();
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
  } finally {
    client.close();
  }
});

isActive(dbName);

// eslint-disable-next-line no-console
app.listen(process.env.PORT || 5000, () => console.log('\nServer aberto'));
