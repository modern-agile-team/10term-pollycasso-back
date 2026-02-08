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
