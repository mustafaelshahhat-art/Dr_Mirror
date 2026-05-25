import { BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys';

export async function useMongoAuthState(collection) {
  await collection.createIndex({ updatedAt: 1 });

  const readData = async (id) => {
    const doc = await collection.findOne({ _id: id });
    if (!doc?.value) return null;
    return JSON.parse(doc.value, BufferJSON.reviver);
  };

  const writeData = (id, value) => collection.updateOne(
    { _id: id },
    { $set: { value: JSON.stringify(value, BufferJSON.replacer), updatedAt: new Date() } },
    { upsert: true },
  );

  const removeData = (id) => collection.deleteOne({ _id: id });

  const creds = (await readData('creds')) ?? initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(ids.map(async (id) => {
            let value = await readData(`${type}-${id}`);
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          }));
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData('creds', creds),
  };
}
