const express = require('express');
const router = express.Router();

const { Mention, User, } = require('../models'); // User 모델도 함께 불러와야 해
const { isLoggedIn } = require('./middlewares');
const { Op } = require('sequelize');


// 1. 멘션 생성 (POST /mention)

router.post('/', isLoggedIn, async (req, res, next) => {
  try {
    const { receiver_id, target_type, target_id, context } = req.body; 
    const sender_id = req.user.id; 


    const receiver = await User.findOne({ where: { id: receiver_id } });
    if (!receiver) {
      return res.status(404).send('멘션을 받을 유저가 존재하지 않습니다.');
    }

    const mention = await Mention.create({
      senders_id: sender_id,
      receiver_id,
      target_type,
      target_id, 
      context,
      createAt: new Date(),
    });

    // 생성된 멘션 + 보낸 유저 정보 포함 반환
    const fullMention = await Mention.findOne({
      where: { id: mention.id },
      include: [
        {
          model: User,
          as: 'Sender',
          attributes: ['id', 'nickname'],
        },
        {
          model: User,
          as: 'Receiver',
          attributes: ['id', 'nickname'],
        },
      ],
    });

    res.status(201).json(fullMention);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// 2. 받은 멘션 목록 조회
// GET: localhost:3065/mention/received
router.get('/received', isLoggedIn, async (req, res, next) => {
  try {
    const receiver_id = req.user.id;

    const mentions = await Mention.findAll({
      where: { receiver_id },
      include: [
        {
          model: User,
          as: 'Sender',
          attributes: ['id', 'nickname'],
        },
        {
          model: User,
          as: 'Receiver',
          attributes: ['id', 'nickname'],
        },
      ],
      order: [['createAt', 'DESC']], 
    });

    res.status(200).json(mentions);
  } catch (error) {
    console.error(error);
    next(error);
  }
});


router.get('/sent', isLoggedIn, async (req, res, next) => {
  try {
    const sender_id = req.user.id;

    const mentions = await Mention.findAll({
      where: { senders_id: sender_id }, 
      include: [
        {
          model: User,
          as: 'Sender',
          attributes: ['id', 'nickname'],
        },
        {
          model: User,
          as: 'Receiver',
          attributes: ['id', 'nickname'],
        },
      ],
      order: [['createAt', 'DESC']],
    });

    res.status(200).json(mentions);
  } catch (error) {
    console.error(error);
    next(error);
  }
});


router.delete('/:mentionId', isLoggedIn, async (req, res, next) => {
  try {
    const mention = await Mention.findOne({
      where: { id: req.params.mentionId },
    });

    if (!mention) {
      return res.status(404).send('멘션이 존재하지 않습니다.');
    }


    if (mention.senders_id !== req.user.id) {
      return res.status(403).send('멘션을 삭제할 권한이 없습니다.');
    }

    await Mention.destroy({
      where: {
        id: req.params.mentionId,
        senders_id: req.user.id, 
      },
    });

    res.status(200).json({ MentionId: parseInt(req.params.mentionId, 10) });
  } catch (error) {
    console.error(error);
    next(error);
  }
});


router.get('/users', isLoggedIn, async (req, res, next) => {
  try {
    const { q, limit = 5, offset = 0 } = req.query;
    const userId = req.user.id;


    const users = await User.findAll({
      where: {
        nickname: {
          [Op.like]: `%${q}%`,
        },
        id: {
          [Op.ne]: userId, // 본인은 추천 안 하기
        },
      },
      attributes: ['id', 'nickname', 'profile_img'],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

module.exports = router;
