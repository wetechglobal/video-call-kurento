import { mailTest } from '../config';

const br = `<br />`;

const testContent = (to, arrBcc) => mailTest ?
    `${br}${br}
    [MAIL TEST]
    ${br}
    to : ${to}
    ${br}
    bcc :  ${arrBcc} `
    : null;

const emailModel = (from, to, subject, body, arrBcc) => {
    return {
        from: from,
        to: !mailTest ? to : mailTest,
        subject: subject,
        html: body + ` ` + testContent(to, arrBcc),
        bcc: !mailTest ? arrBcc : null,
        keepBcc: arrBcc && arrBcc.length > 0 ? true : false,
    }
};

export default emailModel;