export interface Territory {
  id: string;
  name: string;
  mapImageUrl: string;
  createdAt: number;
}

export interface Block {
  id: string;
  territoryId: string;
  name: string;
  streetNames?: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  createdAt: number;
}

export type Side = 'top' | 'bottom' | 'left' | 'right';

export interface House {
  id: string;
  blockId: string;
  territoryId: string;
  side: Side;
  streetName: string;
  number: string;
  status: 'not_visited' | 'visited';
  order: number;
  createdAt: number;
}
