import { getItems } from "../mock-data/itemsData";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export async function getItemsList() {
  await delay();
  return [...getItems()];
}

export async function getItemById(id) {
  await delay();
  return getItems().find((i) => i.id === Number(id)) || null;
}

export async function createItem(data) {
  await delay(200);
  return { id: Date.now(), ...data };
}

export async function updateItem(id, data) {
  await delay(200);
  return { id, ...data };
}

export async function deleteItem(id) {
  await delay(200);
  return { success: true };
}
