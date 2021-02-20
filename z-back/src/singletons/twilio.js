import twilio from 'twilio';
import { twilioSId, twilioToken } from '../config';

const client = twilio(twilioSId, twilioToken);

export default client;
