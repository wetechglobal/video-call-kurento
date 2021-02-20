import fs from 'fs';
import path from 'path';

import Err4xx from '../errors/Err4xx';
import convertFlacToTxt from '../kurento/utils/convertFlacToTxt';
import convertMp4ToFlac from '../kurento/utils/convertMp4ToFlac';
import { isBeingProcessed } from '../kurento/utils/convert';
import { filesDir } from '../config';

const typeDef = `
  input FileUpdateInput {
    type: String!
    id: String!
    filename: String!
    command: String!
    newName: String
  }

  type Mutation {
    fileUpdate(file: FileUpdateInput!): EmptyResult
  }
`;

const resolver = {
  Mutation: {
    fileUpdate: async (rootValue, args, req) => {
      const { type, id, command } = args.file;
      // TODO validate args

      // TODO check id exists and privilege

      const dir = `${filesDir}${type}-${id}`;
      const filename = path.join(dir, args.file.filename);
      if (!filename.startsWith(dir)) {
        throw new Err4xx('InvalidFilename');
      }
      if (!fs.existsSync(filename)) {
        throw new Err4xx('FileNotfound');
      }
      if (!fs.statSync(filename).isFile()) {
        throw new Err4xx('InvalidFilename');
      }
      if (isBeingProcessed(filename)) {
        throw new Err4xx('FileProcessing');
      }

      if (command === 'delete') {
        fs.unlinkSync(filename);
        return;
      }

      if (command === 'rename') {
        const newName = path.join(dir, args.file.newName);
        if (fs.existsSync(newName)) {
          throw new Err4xx('FileAlreadyExists');
        }
        fs.renameSync(filename, newName);
        const oldNameWithoutExt = filename.replace(/\.\w+$/, '');
        const newNameWithoutExt = newName.replace(/\.\w+$/, '');
        ['.mp4', '.flac', '.txt'].forEach(ext => {
          const oldName = oldNameWithoutExt + ext;
          if (fs.existsSync(oldName)) {
            fs.renameSync(oldName, newNameWithoutExt + ext);
          }
        });
        return;
      }

      if (command === 'mp4-flac') {
        await convertMp4ToFlac(filename);
        return;
      }

      if (command === 'flac-txt') {
        await convertFlacToTxt(filename);
        return;
      }

      throw new Err4xx('InvalidFileCommand');
    },
  },
};

export { typeDef, resolver };
