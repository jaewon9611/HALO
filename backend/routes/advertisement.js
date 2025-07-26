const express = require('express');
const router = express.Router();
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { Advertisement } = require('../models');

const isAdmin = require('../middlewares/isAdmin');
const { Op } = require('sequelize');


// 광고 이미지 업로드 폴더 체크
try {
  fs.accessSync('uploads/advertisement_uploads');
} catch (error) {
  console.log('advertisement_uploads 폴더가 없으면 생성합니다.');
  fs.mkdirSync('uploads/advertisement_uploads');
}

const uploadAdvertisementImage = multer({
  storage: multer.diskStorage({
    destination(req, file, done) {
      // uploads/advertisement_uploads 폴더가 반드시 미리 존재해야 함
      done(null, 'uploads/advertisement_uploads');
    },
    filename(req, file, done) {
      const ext = path.extname(file.originalname);
      const basename = path.basename(file.originalname, ext);
      done(null, `${basename}_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// 광고 등록
router.post('/', isAdmin, async (req, res, next) => {
  try {
    const { title, target_url, start_date, end_date, is_active, image_url } = req.body;

    const advertisement = await Advertisement.create({
      title,
      image_url, // ⭐ 프론트에서 넘어온 image_url 사용!
      target_url,
      start_date,
      end_date,
      is_active: Boolean(is_active),
    });

    res.status(201).json(advertisement);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// 이미지 업로드
router.post('/image', isAdmin, uploadAdvertisementImage.single('image'), (req, res, next) => {
  if (req.file) {
    console.log(req.file);
    res.json(req.file.filename);
  } else {
    res.status(400).send('이미지 파일이 업로드되지 않았습니다.');
  }
});

// 광고 목록 조회
router.get('/', isAdmin, async (req, res, next) => {
  try {
    const advertisements = await Advertisement.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(advertisements);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// 광고 수정
router.patch('/:id', isAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    const { title, target_url, start_date, end_date, is_active, image_url } = req.body;

    const [updated] = await Advertisement.update(
      {
        title,
        target_url,
        start_date,
        end_date,
        is_active: Boolean(is_active),
        image_url,
      },
      {
        where: { id },
      }
    );

    if (updated) {
      res.status(200).json({ message: '광고가 수정되었습니다.' });
    } else {
      res.status(404).json({ message: '광고를 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});




// 광고 삭제
router.delete('/:id', isAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;

    const deleted = await Advertisement.destroy({
      where: { id },
    });

    if (deleted) {
      res.status(200).json({ message: '광고가 삭제되었습니다.' });
    } else {
      res.status(404).json({ message: '광고를 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});

//광고 조회
router.get('/active', async (req, res, next) => {
  try {
    const today = new Date();

    const activeAds = await Advertisement.findAll({
      where: {
        is_active: true,
        start_date: { [Op.lte]: today },
        end_date: { [Op.gte]: today },
      },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(activeAds);
  } catch (error) {
     console.error(error);
    next(error);
  }
});
//광고 조회
router.get('/:id', async (req, res, next) => {
  try {
    const ad = await Advertisement.findByPk(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });
    }
    res.status(200).json(ad);
  } catch (error) {
    console.error(error);
    next(error);
  }
});


module.exports = router;
