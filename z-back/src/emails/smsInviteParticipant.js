import { twilioFrom, siteUrl } from '../config';
import twilio from '../singletons/twilio';
import { formatDateTime } from './inviteParticipant';

const smsInviteParticipant = (dbRoomToken, dbRoom, dbDoctor) => {
  //
  const isInstant = dbRoom.caseId === 'instant-sessions';
  const doctorName = dbDoctor ? dbDoctor.displayName() : 'our staff';
  const url = `${siteUrl}/?t=${dbRoomToken.id}-${dbRoomToken.tokenValue}`;
  const st = formatDateTime(dbRoom.startTime, dbRoom.timezone);
  const tz = `(UTC ${dbRoom.timezone || '+11'})`;
  //
  const instantText = `Click the link here ${url} to start video call to our staff.

A support solution from MAG.`;
  //
  const fullText = `MAG video session with ${doctorName}, starting at ${st} ${tz} - open this link to join ${url}`;
  //
  return twilio.messages.create({
    body: isInstant ? instantText : fullText,
    from: twilioFrom,
    to: dbRoomToken.phone,
  });
};

export default smsInviteParticipant;
