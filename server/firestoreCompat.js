const {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  increment,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteField,
} = require('firebase/firestore');

function toAdminDocSnapshot(clientSnap) {
  return {
    exists: clientSnap.exists(),
    id: clientSnap.id,
    data: () => clientSnap.data(),
    ref: clientSnap.ref,
  };
}

function toAdminQuerySnapshot(clientSnap) {
  return {
    empty: clientSnap.empty,
    size: clientSnap.size,
    docs: clientSnap.docs.map(toAdminDocSnapshot),
  };
}

function translateFieldValue(value) {
  if (value == null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(translateFieldValue);
  }

  const methodName = value._methodName || value.methodName;
  if (methodName === 'FieldValue.increment') {
    const amount = value._operand ?? value.operand ?? 1;
    return increment(amount);
  }
  if (methodName === 'FieldValue.serverTimestamp') {
    return serverTimestamp();
  }
  if (methodName === 'FieldValue.arrayUnion') {
    return arrayUnion(...(value._elements || value.elements || []));
  }
  if (methodName === 'FieldValue.arrayRemove') {
    return arrayRemove(...(value._elements || value.elements || []));
  }
  if (methodName === 'FieldValue.delete') {
    return deleteField();
  }

  const translated = {};
  for (const [key, nested] of Object.entries(value)) {
    translated[key] = translateFieldValue(nested);
  }
  return translated;
}

class CompatDocumentReference {
  constructor(clientDb, collectionName, docId) {
    this._clientDb = clientDb;
    this._collectionName = collectionName;
    this._id = docId;
    this.id = docId;
  }

  _ref() {
    return doc(this._clientDb, this._collectionName, this._id);
  }

  get() {
    return getDoc(this._ref()).then(toAdminDocSnapshot);
  }

  set(data, options = {}) {
    return setDoc(this._ref(), translateFieldValue(data), options);
  }

  update(data) {
    return updateDoc(this._ref(), translateFieldValue(data));
  }

  delete() {
    return deleteDoc(this._ref());
  }
}

class CompatQuery {
  constructor(clientDb, collectionName, constraints = []) {
    this._clientDb = clientDb;
    this._collectionName = collectionName;
    this._constraints = constraints;
  }

  where(field, op, value) {
    return new CompatQuery(this._clientDb, this._collectionName, [
      ...this._constraints,
      where(field, op, value),
    ]);
  }

  orderBy(field, direction = 'asc') {
    return new CompatQuery(this._clientDb, this._collectionName, [
      ...this._constraints,
      orderBy(field, direction),
    ]);
  }

  limit(count) {
    return new CompatQuery(this._clientDb, this._collectionName, [
      ...this._constraints,
      limit(count),
    ]);
  }

  get() {
    const colRef = collection(this._clientDb, this._collectionName);
    const q = this._constraints.length
      ? query(colRef, ...this._constraints)
      : colRef;
    return getDocs(q).then(toAdminQuerySnapshot);
  }
}

class CompatCollectionReference extends CompatQuery {
  constructor(clientDb, collectionName, constraints = []) {
    super(clientDb, collectionName, constraints);
  }

  doc(docId) {
    if (docId === undefined || docId === null) {
      const colRef = collection(this._clientDb, this._collectionName);
      const autoRef = doc(colRef);
      return new CompatDocumentReference(this._clientDb, this._collectionName, autoRef.id);
    }
    return new CompatDocumentReference(this._clientDb, this._collectionName, docId);
  }

  add(data) {
    const colRef = collection(this._clientDb, this._collectionName);
    return addDoc(colRef, translateFieldValue(data)).then((ref) => ({ id: ref.id }));
  }
}

function createCompatDb(clientDb) {
  return {
    collection(collectionName) {
      return new CompatCollectionReference(clientDb, collectionName);
    },
    batch() {
      const batch = writeBatch(clientDb);
      return {
        set(docRef, data, options = {}) {
          const ref = docRef._ref ? docRef._ref() : docRef;
          batch.set(ref, translateFieldValue(data), options);
        },
        update(docRef, data) {
          batch.update(docRef._ref(), translateFieldValue(data));
        },
        delete(docRef) {
          batch.delete(docRef._ref());
        },
        commit() {
          return batch.commit();
        },
      };
    },
  };
}

module.exports = { createCompatDb };
