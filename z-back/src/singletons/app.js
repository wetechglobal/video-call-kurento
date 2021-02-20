import path from 'path';

import bodyParser from 'body-parser';
import contentDisposition from 'content-disposition';
import cors from 'cors';
import express from 'express';
import graphqlExpress from 'express-graphql';
import { apolloUploadExpress } from 'apollo-upload-server';
import { graphiqlExpress } from 'graphql-server-express';

import corsConfig from './appCorsConfig';
import graphiqlConfig from './appGraphiqlConfig';
import graphqlConfig from './appGraphqlConfig';
import { handleNotfound, handleError } from './appHandleError';
import utils from '../utils';
import emails from '../emails';
import { Op } from 'sequelize';
import { isInRoom } from '../kurento/socket-handlers/participantStatus';
import { socketCloseSession } from '../kurento/handleSocketServer';
// Hail front end
import '../../../zfront/src/server/hook';
import { renderBack, renderError } from '../../../zfront/src/server/renderer';
// Hail kurento
import { filesDir, tmpFilesDir } from '../config';
import fs from 'fs';

// Upload
import appHandleUpload from './appHandleUpload';
import models from '../models';

const app = express();
const apiRouter = express.Router();

/**
 * Define router for rest APIs
 * Just for temporary, move these to another file later
 */
apiRouter.get('/roomDocs/:roomId', async (req, res) => {
  const roomId = req.params.roomId;
  const room = await models.Room.findById(roomId);
  if (room) {
    const caseId = room.caseId;
    const filepath = `${filesDir}case-documents-${caseId}/`;
    let list = [];
    if (fs.existsSync(filepath)) {
      list = fs.readdirSync(filepath);
    }
    res.json({
      list,
      caseId,
    });
  }
});

apiRouter.post('/create-case', async (req, res) => {
  try {
    // const dbUser = await models.User.findByAuthToken(req.headers.authorization);
    // if (!dbUser || dbUser.role !== models.User.ROLE_ADMIN) {
    //   res.json({
    //     status: false,
    //     message: "Auth Fail"
    //   });
    //   return;
    // }
    const dbUser = await models.User.findThenCompare(req.body.acc, req.body.pass);
    if (!dbUser || dbUser.role !== models.User.ROLE_ADMIN) {
      res.json({
        status: false,
        message: 'Auth Fail',
      });
      return;
    }

    const { no, description, doctor, claimant } = req.body;

    var checkDoctor = await models.User.findByEmail(doctor.email);
    if (!checkDoctor) {
      doctor.id = utils.newId();
      doctor.hashedPwd = '';
      doctor.role = models.User.ROLE_DOCTOR;

      checkDoctor = await models.User.create(doctor);
    }

    var checkClaimant = await models.User.findOne({
      where: {
        [Op.and]: [{ email: claimant.email }, { firstName: claimant.firstName }, { lastName: claimant.lastName }, { role : models.User.ROLE_CLAIMANT}],
      },
    });
    if (!checkClaimant) {
      claimant.id = utils.newId();
      claimant.hashedPwd = '';
      claimant.role = models.User.ROLE_CLAIMANT;

      checkClaimant = await models.User.create(claimant);
    }
    var checkCase = await models.Case.findOne({
      where: {
        no: {
          [Op.eq]: no,
        },
      },
    });
    if (!checkCase) {
      // Create new Case
      checkCase = await models.Case.create({
        no,
        description,
        doctorId: checkDoctor.id,
        claimantId: checkClaimant.id,
        createdById: dbUser.id,
      });
    }

    var { title, note, startTime, endTime, timezone, assessmentId } = req.body;

    // startTime = momentParse(startTime, timezone);
    // endTime = momentParse(endTime, timezone);
    // Add to database
    const room = await models.Room.create({
      id: utils.newId(),
      title,
      caseId: checkCase.id,
      note,
      createdBy: dbUser.id,
      startTime,
      endTime,
      timezone,
      assessmentId,
    });

    // Insert new user to db with url token
    await models.RoomToken.create({
      id: utils.newId(),
      roomId: room.id,
      title: doctor.title,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      email: doctor.email,
      phone: doctor.phone,
      tokenValue: utils.newUrlToken(),
    });

    // Insert new user to db with url token
    await models.RoomToken.create({
      id: utils.newId(),
      roomId: room.id,
      title: claimant.title,
      firstName: claimant.firstName,
      lastName: claimant.lastName,
      email: claimant.email,
      phone: claimant.phone,
      tokenValue: utils.newUrlToken(),
    });

    const participants = await models.RoomToken.findAll({
      where: {
        roomId: {
          [Op.eq]: room.id,
        },
      },
    }).map(p => ({
      id: p.id,
      title: p.title,
      firstName: p.firstName,
      lastName: p.lastName,
      displayName: p.displayName,
      email: p.email,
      phone: p.phone,
      inviteToken: utils.encodeToken(p),
      isInRoom: isInRoom(p.id),
    }));

    res.json({
      caseId: checkCase.id,
      roomId: room.id,
      participants,
      status: true,
      message: 'success',
    });
  } catch (err) {
    res.json({
      status: false,
      message: err,
    });
  }
  return;
});

apiRouter.post('/cancel-case', async (req, res) => {
  try {
    const dbUser = await models.User.findThenCompare(req.body.acc, req.body.pass);
    if (!dbUser || dbUser.role !== models.User.ROLE_ADMIN) {
      res.json({
        status: false,
        message: 'Auth Fail',
      });
      return;
    }

    const room = await models.Room.findById(req.body.roomId);
    if (!room) {
      res.json({
        status: false,
        message: 'RoomNotfound',
      });
      return;
    }

    if (room.status === models.Room.STATUS_CLOSED) {
      res.json({
        status: false,
        message: 'room closed already',
      });
      return;
    }

    // Update database
    await models.Room.update(
      {
        status: models.Room.STATUS_CLOSED,
      },
      {
        where: {
          id: {
            [Op.eq]: req.body.roomId,
          },
        },
      },
    );
    socketCloseSession(req.body.roomId);

    res.json({
      status: true,
      message: 'success',
    });
  } catch (err) {
    res.json({
      status: false,
      message: err,
    });
  }
  return;
});

const checkAdmin = async (req, res) => {
  const currentUser = await models.User.current(req);
  if (!currentUser || currentUser.role !== models.User.ROLE_ADMIN) {
    res.writeHead(401);
    res.end('Unauthorized');
    return false;
  }
  return true;
};
const sendCsv = (arr, res) => {
  const csv = arr
    .map(u =>
      [u.displayName(), u.email || '', u.phone || '']
        .map(v => JSON.stringify(v).replace('\\"', '""'))
        .join(','),
    )
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.end(`"Full name","Email","Phone"\n` + csv);
};
apiRouter.get('/doctor-csv', async (req, res) => {
  if (!await checkAdmin(req, res)) {
    return;
  }
  const drs = await models.User.findAll({
    where: {
      role: models.User.ROLE_DOCTOR,
    },
  });
  sendCsv(drs, res);
});
apiRouter.get('/claimant-csv', async (req, res) => {
  if (!await checkAdmin(req, res)) {
    return;
  }
  const clms = await models.User.findAll({
    where: {
      role: models.User.ROLE_CLAIMANT,
    },
  });
  sendCsv(clms, res);
});

app.use(cors(corsConfig));

// Upload
appHandleUpload(app);

// Hail front end
app.use('/', express.static(path.join(__dirname, '../../../zfront/static')));
app.use('/public', express.static(path.join(__dirname, '../../../zfront/bin/public')));
app.use('/-', renderBack);
app.use('/-', renderError);
// Hail kurento
// TODO secure files
app.use(
  '/preview', // for preview
  express.static(filesDir),
);
app.use(
  '/download', // for download
  express.static(filesDir, {
    setHeaders: (res, filepath) => {
      res.setHeader('Content-Disposition', contentDisposition(filepath));
    },
  }),
);
app.use('/temp', express.static(tmpFilesDir));

app.use('/graphql', bodyParser.json(), apolloUploadExpress(), graphqlExpress(graphqlConfig));

app.use('/graphiql', graphiqlExpress(graphiqlConfig));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
/**
 * Rest APIs
 */
app.use('/api', apiRouter);

app.use(handleNotfound);
app.use(handleError);

export default app;
