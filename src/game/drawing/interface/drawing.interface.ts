export type DrawingTool = 'pencil' | 'brush' | 'neon' | 'bucket' | 'eraser';

export interface DrawLine {
  tool: DrawingTool;
  color: string;
  size: number;
  points: number[];
}

export interface DrawData {
  lines: DrawLine[];
}

export interface IDrawingRepo {
  getDrawingsByMatchAndRound(params: {
    matchId: number;
    round: number;
  }): Promise<Record<string, DrawData>>;
}

export const DRAWING_REPO = Symbol('DRAWING_REPO');
