import path from 'path';

export const serverPort = 3001;

export const siteName = 'MAG Video Centre';
export const siteHost = process.env.NODE_ENV === 'production' ? 'localhost' : '45.32.191.203';
export const apiCirrus =
  process.env.NODE_ENV === 'production'
    ? 'https://magconnect.com.au/'
    : 'http://staging.magconnect.com.au/';
export const cirrusAuthToken =
  process.env.NODE_ENV === 'production'
    ? 'Basic c3lzdGVtQG1lZGljb2xlZ2FsYXNzZXNzbWVudHNncm91cC5jb20uYXU6QUhoMjc1NE1OeE5vR0IvdE1TOGRVQlB6Y1VMZ2dFcDEvcUhhUFJoUjhWUVpOcTF6YUpIT2J2MmQ4MEd5Q2lmTVRBPT0='
    : 'Basic YWRtaW46QVArTGEzZ1VoNUdBRnhHeVJIT21GVXRJQUc2OUxOV1E4V3NWU2tpMlJKcWlxamhQU2hnNWU3d3FOQkpWRkllaVRBPT0=';
export const siteUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://video.magconnect.com.au'
    : 'https://staging-video.magconnect.com.au';

export const dbConn = 'postgres://devusr:devpwd@localhost/videostaging';

export const mailerConf = {
  service: 'SendGrid',
  auth: {
    user: 'mlag',
    pass: 'mlag2020',
  },
};
export const apiKey = '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';

export const mailerFrom = `"${siteName}" admin@medicolegalassessmentsgroup.com.au`;

export const twilioSId = 'AC75ad0a8576936764ad62a2dfb8d48ebb';
export const twilioToken = '6ca9318864cb6b3d84d38ea02397fe4a';
export const twilioFrom = '+61447686140';
export const mailTest =
  process.env.NODE_ENV === 'production' ? '' : 'cirrustest2018@gmail.com';
export const phoneTest =
  process.env.NODE_ENV === 'production' ? '' : '';
export const doctorsent = 'doctorsent@medicolegalassessmentsgroup.com.au';
export const cmsent = 'CMsent@medicolegalassessmentsgroup.com.au';
export const supportMail = 'support@medicolegalassessmentsgroup.com.au';

export const filesDir =
  process.env.NODE_ENV === 'production' ? '/home/mag/files/' : path.join(__dirname);
export const tmpFilesDir =
  process.env.NODE_ENV === 'production' ? '/tmp/mag-files/' : path.join(__dirname);

export const kurentoUri = `ws://${siteHost}:8888/kurento`;

export const ggcProjectId = 'mag-cirrus-app';
export const ggcBucketName = 'mag-cirrus-app';
export const gccKeyFilename = '../mag-cirrus-app-0a8c3f0a5c4e.json';
