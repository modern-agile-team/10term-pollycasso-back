import { Room } from '../entities/room.entity';

export interface IRoomsEventPublisher {
  roomCreated(room: Room): void;
  roomUpdated(room: Room): void;
  roomDeleted(id: number): void;
}
