import { mailerFrom, siteUrl, mailTest } from '../config';
import mailer from '../singletons/mailer';
import emailModel from './emailModel';
import { singatureMail } from './singatureMail';

const verifyRegister = (req, dbUser, dbToken) => {

  mailer.sendMail(emailModel(mailerFrom
    , dbUser.email
    , '[MAG Video Centre] Account verification'
    , `Dear ${dbUser.displayName()}. <br />
    <br />
    Your account with email address (as username) ${dbUser.email} has been created on MAG Video Centre.<br />
    <br />
    Please follow this link to verify your account: ${siteUrl}/-/verify?token=${dbToken.id}-${dbToken.tokenValue}<br />
    ${singatureMail}`));
};
export default verifyRegister;
