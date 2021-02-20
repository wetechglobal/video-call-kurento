import { mailerFrom, twilioFrom, siteUrl, mailTest, phoneTest } from '../config';
import models from '../models';
import twilio from '../singletons/twilio';
import mailer from '../singletons/mailer';
import { formatDateTime } from './inviteParticipant';
import emailModel from './emailModel';
import { singatureMail } from './singatureMail';

const notifyParticipants = async ({ roomId, userId, roomTokenId }) => {
  const [room, user, rts] = await Promise.all([
    models.Room.findById(roomId),
    userId && models.User.findById(userId),
    models.RoomToken.findAll({
      where: {
        roomId,
      },
    }),
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

  const csNo = cs.no;
  const drName = `${dr ? `: ${dr.displayName()}` : ``}`;
  const clmName = `${clm ? `: ${clm.displayName()}` : ``}`;
  const st = formatDateTime(room.startTime, room.timezone);
  const tz = `(UTC ${room.timezone || '+11'})`;
  const br = `<br />`;
  let filtered = rts;
  if (roomTokenId) {
    filtered = filtered.filter(t => t.id !== roomTokenId);
  } else if (user) {
    filtered = filtered.filter(
      t => !((user.phone && t.phone === user.phone) || (user.email && t.email === user.email)),
    );
  }

  filtered.forEach(t => {
    const url = `${siteUrl}/?t=${t.id}-${t.tokenValue}`;

    if (t.phone) {
      twilio.messages.create({
        body: `The other participant has joined the video session between Examinee${clmName} and Doctor${drName} at ${st} ${tz}.
        Click on this link to join now: ${url}

        If the video connection does not work due to video or audio equipment, close the browser and click on the video link above again.
        In case of technical or other difficulty please call 02 8090 7611 immediately.

        Sincerely,
        MAG Team`,
        from: twilioFrom,
        to: !phoneTest ? t.phone : phoneTest,
      });
    }

    if (t.email) {
      mailer.sendMail(emailModel(mailerFrom,
        t.email,
        `Video Assessment Started - Join Now - Case No: ${csNo} - Claimant Name${clmName}`,
        `
          To whom it may concern, ${br}
          Regarding the upcoming video assessment:  ${br}
          - Examinee${clmName}  ${br}
          - Specialist${drName}  ${br}
          - Date & Time: ${st} ${tz}  ${br}
          ${br}
          The other participant has joined the session.  ${br}
          <a href='${url}'> Click here to join now </a>   ${br}
          ${br}
          If the video connection does not work due to video or audio equipment, close the browser and click on the video link above again. ${br}
          In case of technical or other difficulty please call 02 8090 7611 immediately. ${br}
          ${singatureMail}`));
    }
  });
};

export default notifyParticipants;
