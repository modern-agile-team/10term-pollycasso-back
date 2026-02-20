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

const VALID_TOOLS = ['pencil', 'brush', 'neon', 'bucket', 'eraser'] as const;

export function isValidDrawData(data: unknown): data is DrawData {
  if (typeof data !== 'object' || data === null) return false;

  const v = data as Record<string, unknown>;
  if (!Array.isArray(v.lines)) return false;

  return v.lines.every((line) => {
    if (typeof line !== 'object' || line === null) return false;
    const l = line as Record<string, unknown>;

    if (typeof l.tool !== 'string' || !VALID_TOOLS.includes(l.tool as DrawingTool)) return false;

    if (typeof l.color !== 'string') return false;

    if (typeof l.size !== 'number' || !Number.isFinite(l.size) || l.size <= 0) return false;

    if (!Array.isArray(l.points)) return false;
    if (l.points.length < 2) return false;
    if (l.points.length % 2 !== 0) return false;

    if (!l.points.every((p) => typeof p === 'number' && Number.isFinite(p))) return false;

    return true;
  });
}

export interface IDrawingRepo {
  getDrawingsByMatchAndRound(params: {
    matchId: number;
    round: number;
  }): Promise<Record<string, DrawData>>;
}

export interface MatchRoundCriteria {
  matchId: number;
  round: number;
}

export const DRAWING_REPO = Symbol('DRAWING_REPO');
