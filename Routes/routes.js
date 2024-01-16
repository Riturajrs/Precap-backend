const express = require('express')
const { check } = require('express-validator')
const { verifyToken } = require('../middleware/auth')
const controller = require('../controllers/controllers')
const uploadImage = require('../middleware/upload')
const multer = require('multer')

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

// For adding new message of user
router.post(
  '/newMessage',
  [
    check('email')
      .not()
      .isEmpty()
  ],
  controller.newMessage
)

// For creating new Precap users
router.post(
  '/createAccount',
  [
    check('name')
      .not()
      .isEmpty(),
    check('password')
      .not()
      .isEmpty(),
    check('email')
      .not()
      .isEmpty(),
    check('phone')
      .not()
      .isEmpty()
  ],
  controller.createAccount
)

// For creating authorizing Precap users
router.post(
  '/userLogin',
  [
    check('email')
      .not()
      .isEmpty(),
    check('password')
      .not()
      .isEmpty()
  ],
  controller.userLogin
)

router.post(
  '/addPosts',
  verifyToken,
  upload.single('image'),
  controller.addPosts
)

router.delete(
  '/deletePosts',
  verifyToken,
  controller.deletePosts,
  (req, res, next) =>
    res
      .status(200)
      .json({ data: 'Token is valid', decodedData: req.decodedData })
)

router.get('/getFile',controller.getFile)

module.exports = router
