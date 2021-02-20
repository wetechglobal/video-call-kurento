import moment from 'moment';
import dateFormat from 'dateformat';

const convertTimezonze = (d, tz, parse = false) => {
  tz = tz || '+11';
  const isBehindUTC = /^-/.test(tz);
  tz = tz.replace(/^[-+]/, '');
  tz = Number(tz) * (isBehindUTC ? -1 : 1);
  //
  d = new Date(d);
  let offset = d.getTimezoneOffset() / 60;
  if (parse) {
    const tmp = offset;
    offset = -1 * tz;
    tz = -1 * tmp;
  }
  const utc = d.getTime() + offset * 3600000;
  return new Date(utc + tz * 3600000);
};

export const formatDateTime = (d, tz) => dateFormat(convertTimezonze(d, tz), 'mmm d yyyy, h:MM TT');
export const momentDisplay = (d, tz) => moment(convertTimezonze(d, tz));
export const momentParse = (d, tz) => moment(convertTimezonze(d, tz, true));
