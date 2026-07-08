import { House } from "./types";

// Cache simples em memoria (dura so enquanto o app estiver aberto no navegador).
// Serve para guardar as casas de cada quadra assim que o territorio e aberto,
// deixando a abertura de cada quadra praticamente instantanea depois.
const cache = new Map<string, House[]>();

export function getCachedHouses(blockId: string): House[] | undefined {
  return cache.get(blockId);
}

export function setCachedHouses(blockId: string, houses: House[]) {
  cache.set(blockId, houses);
}
