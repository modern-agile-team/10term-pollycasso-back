import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

export const dayjsKst = (date?: dayjs.ConfigType) => {
  return dayjs(date).tz('Asia/Seoul');
};

export default dayjs;
