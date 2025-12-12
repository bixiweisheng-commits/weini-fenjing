export enum AssetType {
  CHARACTER = 'CHARACTER',
  SCENE = 'SCENE',
  ELEMENT = 'ELEMENT',
}

export interface Asset {
  id: string;
  type: AssetType;
  url: string; // Base64
  name: string;
}

export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';
export type QualityLevel = 'standard' | 'hd' | '4k';

export interface Shot {
  id: string;
  description: string;
  imageUrl?: string;
  isGenerating: boolean;
  aspectRatio: AspectRatio;
  error?: string;
  visualStyle?: string;
  shotType?: string;
}

export interface StoryboardState {
  shots: Shot[];
  gridSize: 2 | 3 | 4 | 5;
  aspectRatio: AspectRatio;
  isPlanning: boolean;
}

export interface GenerationParams {
  prompt: string;
  aspectRatio: AspectRatio;
  gridSize: 2 | 3 | 4 | 5;
  assets: Asset[];
}

export type GridSize = 2 | 3 | 4 | 5;