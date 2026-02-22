export interface RoomUpdatePlayerPayload {
  userId: number;
  changes: {
    isReady: boolean;
  };
}
