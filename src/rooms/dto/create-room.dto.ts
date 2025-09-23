import { RoomMode } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateRoomDto {
  @IsString({ message: '방 이름은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '방 이름은 필수입니다.' })
  @MaxLength(20, { message: '방 이름은 최대 15자까지 입력할 수 있습니다.' })
  name: string;

  @IsEnum(RoomMode, { message: '모드는 SOLO 또는 TEAM 중 하나여야 합니다.' })
  mode: RoomMode;

  @IsInt({ message: '최대 인원은 숫자여야 합니다.' })
  maxPlayers: number;

  @IsOptional()
  @IsBoolean({ message: '비공개 여부는 true 또는 false이어야 합니다.' })
  isPrivate?: boolean;

  @IsOptional()
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @Matches(/^\d{4}$/, {
    message: '비밀번호는 숫자 4자리만 가능합니다.',
  })
  password?: string;
}
