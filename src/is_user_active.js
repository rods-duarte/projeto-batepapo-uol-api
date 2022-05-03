import { MongoClient } from 'mongodb';
import dayjs from 'dayjs';

export default function isActive(dbName) {
  const client = new MongoClient(process.env.MONGO_URL);
  setInterval(async () => {
    const time = Date.now();
    try {
      await client.connect();
      const db = client.db(dbName);
      const participants = await db
        .collection('participants')
        .find({ lastStatus: { $lt: time - 10000 } })
        .toArray();

      if (participants.length === 0) return;

      participants.forEach((participant) => {
        db.collection('participants').deleteOne({ name: participant.name });
        db.collection('messages').insertOne({
          from: participant.name,
          to: 'Todos',
          text: 'sai da sala....',
          type: 'status',
          time: dayjs().format('HH:mm:ss'),
        });
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }, 15000);
}
