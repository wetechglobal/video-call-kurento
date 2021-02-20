import nodemailer from 'nodemailer';
const nodemailerSendgrid = require('nodemailer-sendgrid');
import { apiKey } from '../config';

const mailer = nodemailer.createTransport(nodemailerSendgrid({
    apiKey: apiKey
}));

export default mailer;
