const DB_MODE = 'local';

const dbAdapter = {
  async init() {
    if (DB_MODE === 'local') return await fileDb.openFile();
    return { success: true };
  },

  isReady() {
    if (DB_MODE === 'local') return fileDb.isReady();
    return typeof db !== 'undefined' && db !== null;
  },

  getDbInfo() {
    if (DB_MODE === 'local') return `本機資料庫 ｜ ${fileDb.getFilename() ?? '未開啟'}`;
    return 'Firebase 雲端模式';
  },

  async refresh() {
    if (DB_MODE === 'local') return await fileDb.refresh();
  },

  async getCollection(colName) {
    if (DB_MODE === 'local') return await fileDb.getCollection(colName);
    const snap = await db.collection(colName).get();
    const result = {};
    snap.forEach(d => { result[d.id] = d.data(); });
    return result;
  },

  async getDoc(colName, docId) {
    if (DB_MODE === 'local') return await fileDb.getDoc(colName, docId);
    const snap = await db.collection(colName).doc(docId).get();
    return snap.exists ? snap.data() : null;
  },

  async setDoc(colName, docId, data) {
    if (DB_MODE === 'local') return await fileDb.setDoc(colName, docId, data);
    return await db.collection(colName).doc(docId).set(data);
  },

  async updateDoc(colName, docId, fields) {
    if (DB_MODE === 'local') return await fileDb.updateDoc(colName, docId, fields);
    return await db.collection(colName).doc(docId).update(fields);
  },

  async getProjectsSorted() {
    if (DB_MODE === 'local') return await fileDb.getProjectsSorted();
    const snap = await db.collection('projects').get();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.meta?.timestamp ?? '';
        const tb = b.meta?.timestamp ?? '';
        return tb.localeCompare(ta);
      });
  },

  async pickFile() {
    if (DB_MODE === 'local') return await fileDb.pickFile();
  },

  exportBackup() {
    if (DB_MODE === 'local') fileDb.exportBackup();
    else alert('Firebase 模式請至 Firebase Console 備份');
  }
};

window.dbAdapter = dbAdapter;
