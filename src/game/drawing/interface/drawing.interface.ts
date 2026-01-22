export type DrawingTool = 'pencil' | 'brush' | 'neon' | 'bucket' | 'eraser';

export interface DrawLine {
  tool: DrawingTool;
  color: string;
  size: number;
  points: number[];
  filledImage?: string;
}

export interface DrawData {
  lines: DrawLine[];
}
