import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';

import MessageSchema from './models/message.js';
import PartipantSchema from './models/partipant.js';

const app = express();
app.use(express.json());
dotenv.config();

const client = new MongoClient(process.env.MONGO_URL);
const dbName = 'batepapo-uol-api';

app.post('/partipants', async (req, res) => {
  const { body } = req;
  const time = Date.now();

  if (PartipantSchema.validate(body).error) {
    res.sendStatus(422);
    return;
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const checkExists = await db.collection('partipants').findOne({ ...body });

    if (checkExists) {
      res.sendStatus(409);
      client.close();
      return;
    }

    await db.collection('partipants').insertOne({ ...body, lastStatus: time });
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
      .collection('partipants')
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
  const { headers } = req;

  try {
    await client.connect();
    const db = client.db(dbName);
    const checkExists = await db
      .collection('partipants')
      .findOne({ name: headers.user });

    if (!checkExists) {
      client.close();
      res.sendStatus(404);
      return;
    }

    await db
      .collection('partipants')
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

// eslint-disable-next-line no-console
app.listen(5000, () => console.log('\n Server aberto na porta 5000'));
