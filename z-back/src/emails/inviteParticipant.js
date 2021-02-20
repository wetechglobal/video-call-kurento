import dateFormat from 'dateformat';
import { mailerFrom, siteUrl, mailTest, doctorsent, cmsent } from '../config';
import mailer from '../singletons/mailer';
import models from '../models';
import { Op } from 'sequelize';
import emailModel from './emailModel';
import { singatureMail } from './singatureMail';

export const formatDateTime = (d, tz) => {
  tz = tz || '+11';
  const isBehindUTC = /^-/.test(tz);
  tz = tz.replace(/^[-+]/, '');
  tz = Number(tz) * (isBehindUTC ? -1 : 1);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const targetTime = new Date(utc + tz * 3600000);
  return dateFormat(targetTime, 'h:MM TT mmm d yyyy ');
};

const inviteParticipant = async (req, dbRoomToken, dbRoom, dbDoctor) => {

  const roomtken = await models.RoomToken.findOne({
    where: {
      roomId: {
        [Op.eq]: dbRoomToken.roomId,
      },
      email: {
        [Op.ne]: dbRoomToken.email,
      },
    },
  });
  const isInstant = dbRoom.caseId === 'instant-sessions';
  const url = `${siteUrl}/?t=${dbRoomToken.id}-${dbRoomToken.tokenValue}`;
  // const doctorName = dbDoctor ? dbDoctor.displayName() : 'our staff';
  const userName = roomtken ? roomtken.displayName() : 'our staff';
  const st = formatDateTime(dbRoom.startTime, dbRoom.timezone);
  const et = formatDateTime(dbRoom.endTime, dbRoom.timezone);
  const tz = `(UTC ${dbRoom.timezone || '+11'})`;
  const br = `<br />`;
  //
  const instantText = ` <a href='${url}'> Click here </a>   ${br} to start video call to our staff.${br}
  ${br}
  A support solution from magconnect.com.au`;
  //
  const fullText = `Dear ${dbRoomToken.surName()},  ${br}
  ${br}
  You have been scheduled to attend a video call session with ${userName}, starting at ${st}, and finishing at ${et} ${tz}. ${br}
  ${br}
  <a href='${url}'> Click here to join now </a>   ${br}
  ${br}
  *** System requirements: MAG Video requires Chrome browser on both Windows or Mac Operating Systems. ${br}
  ${singatureMail}
  `;
  //
  return mailer.sendMail(emailModel(mailerFrom, dbRoomToken.email, 'MAG Video Conference Link', isInstant ? instantText : fullText, [cmsent, doctorsent]));
};

export default inviteParticipant;
