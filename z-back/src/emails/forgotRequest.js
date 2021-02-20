import { mailerFrom, siteUrl } from '../config';
import mailer from '../singletons/mailer';
import { singatureMail } from './singatureMail';
import emailModel from './emailModel';

const forgotRequest = (req, dbUser, dbToken) =>

  mailer.sendMail(emailModel(mailerFrom
    , dbUser.email
    , '[MAG Video Centre] Password Recovery', `Dear ${dbUser.displayName()}.
  <br />
  <br />You have requested for password recovery. Please follow this link to recover your password: ${siteUrl}/-/recover?token=${dbToken.id}-${dbToken.tokenValue}
  ${singatureMail}`));

export default forgotRequest;
