import { mailerFrom, supportMail } from '../config';
import models from '../models';
import mailer from '../singletons/mailer';
import emailModel from './emailModel';
import { singatureMail } from './singatureMail';
import { formatDateTime } from './inviteParticipant';

const notifyJoinFail = async ({ roomId, userId, roomTokenId, model }) => {
  const [room, user, rts, rt] = await Promise.all([
    models.Room.findById(roomId),
    userId && models.User.findById(userId),
    models.RoomToken.findAll({
      where: {
        roomId,
      },
    }),
    models.RoomToken.findById(roomTokenId),
  ]);
  if (!rts.length || !room || !(user || roomTokenId)) {
    return;
  }
  const cs = await models.Case.findById(room.caseId);
  if (!cs) {
    return;
  }
  const [dr, clm] = await Promise.all([
    models.User.findById(cs.doctorId),
    models.User.findById(cs.claimantId),
  ]);
  const st = formatDateTime(room.startTime, room.timezone);
  const tz = `(UTC ${room.timezone || '+11'})`;

  const csNo = cs.no;
  const drName = `${dr ? `: ${dr.firstName} ${dr.lastName}` : ``}`;
  const clmName = `${clm ? `: ${clm.firstName} ${clm.lastName}` : ``}`;
  const br = `<br />`;

  var option = "";
  switch (model.options) {
    case "1":
      option = "We could not talk or see each other (I can see myself on the screen)";
      break;
    case "2":
      option = "We could not talk or see each other (I can\'t see myself on the screen)";
      break;
    case "3":
      option = "We could talk but could not see each other (I can see myself on the screen)";
      break;
    case "4":
      option = "We could talk but could not see each other (I can\'t see myself on the screen)";
      break;
    case "5":
      option = "I can\'t connect to my camera or mic";
      break;
    default:
      option = "Other";
      break;

  }

  var reportBy = `${rt.firstName} ${rt.lastName}`;
  if (rt.firstName === dr.firstName) {
    reportBy = `${reportBy} (Specialist)`;
  } else {
    reportBy = `${reportBy} (Claimant)`;
  }

  var mailmodel = emailModel(mailerFrom,
    mailerFrom,
    `Video issues - Case No: ${csNo} - Specialist ${drName} - Claimant ${clmName}`,
    `Issues reported by ${reportBy} for the appointment at ${st} ${tz} ${br}
    ${br}
    ${option} ${br}
    ${model.description} ${br}
    ${singatureMail}`, [supportMail]);

  mailer.sendMail(mailmodel);
};

export default notifyJoinFail;
