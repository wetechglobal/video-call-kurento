import path from 'path';
import multer from 'multer';
import { slugify } from 'transliteration';
import { filesDir } from '../config';
import utils from '../utils';

const storage = multer.diskStorage({
  destination: filesDir,
  filename: (req, file, cb) => {
    // Make dir from case id
    const { caseId } = req.body;
    const filedir = `case-documents-${caseId}/`;
    const filepath = `${filesDir}${filedir}`;
    utils.makeDir(filepath);
    // build file name and return
    const { name, ext } = path.parse(file.originalname);
    const normalizedName = `${slugify(name)}-${utils.newId()}`;
    cb(null, `${filedir}${normalizedName}${ext.toLowerCase()}`);
  },
});
const upload = multer({
  storage,
});

export default app => {
  app.post('/upload', upload.single('file'), (req, res) => {
    res.json({
      filename: req.file.filename,
    });
  });
};
