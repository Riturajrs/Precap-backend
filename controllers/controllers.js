const { validationResult } = require('express-validator')
const HttpError = require('../models/http-error')
const Subscribers = require('../models/subscribers')
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const auth = require('../middleware/auth')
const { uploadFile, deleteFile, getFile } = require('../middleware/upload')
const Posts = require('../models/posts')


const newMessage = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    )
  }
  const { email, newsletter, messages, phone, name } = req.body

  let existingSubscriber
  try {
    existingSubscriber = await Subscribers.findOne({ email: email })
  } catch (err) {
    existingSubscriber = null
  }

  let phone_stringified
  if (typeof phone === 'string') {
    phone_stringified = phone
  } else if (phone) {
    phone_stringified = phone.toString()
  }

  timestamp = new Date().toISOString()

  if (!existingSubscriber) {
    existingSubscriber = new Subscribers({
      name,
      email,
      newsletter: !!newsletter,
      messages: messages ? [messages] : [],
      phone: phone_stringified,
      timestamp: messages ? [timestamp] : []
    })
  } else {
    existingSubscriber.name = name || existingSubscriber.name
    existingSubscriber.newsletter = !!newsletter | existingSubscriber.newsletter
    existingSubscriber.phone = phone || existingSubscriber.phone
    if (messages) {
      existingSubscriber.messages.push(messages)
      existingSubscriber.timestamp.push(timestamp)
    }
  }

  try {
    await existingSubscriber.save()
  } catch (err) {
    return next(new HttpError('Something went wrong while saving', 500))
  }

  res.status(200).json({ data: 'Your response was successfully noted' })
}

const createAccount = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    )
  }

  const { name, password, email, phone } = req.body

  const salt = await bcrypt.genSalt(10)
  const cryptedPassword = await bcrypt.hash(password, salt)

  let existingUser
  try {
    existingUser = await User.findOne({ email: email })
  } catch (err) {}
  if (existingUser) {
    res.status(400).json({ data: 'Account already exists' })
  }

  let phone_stringified
  if (typeof phone === 'string') {
    phone_stringified = phone
  } else {
    phone_stringified = phone.toString()
  }

  existingUser = new User({
    name,
    email,
    phone: phone_stringified,
    password: cryptedPassword
  })

  try {
    await existingUser.save()
  } catch (err) {
    console.log(err)
    const error = new HttpError(
      'An error occurred while writing to database',
      500
    )
    return next(error)
  }
  res.status(201).json({ data: 'New account generated!!' })
}

const userLogin = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    )
  }

  const { email, password } = req.body

  let user
  try {
    user = await User.findOne({ email: email })
  } catch (error) {
    return next(new HttpError('User does not exists', 404))
  }
  if (!user) {
    return next(new HttpError('User does not exists', 404))
  }

  const passwordValidity = await bcrypt.compare(password, user.password)

  if (!passwordValidity) {
    return next(new HttpError('Authentication failed', 401))
  }

  const signedToken = auth.signToken((userId = user.id), email)

  res.status(201).json({ data: 'Account is verified!!', token: signedToken })
}

const addPosts = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    )
  }

  const { content, links } = req.body
  const decodedData = res.decodedData
  if (!decodedData) {
    next(new HttpError('Precap user not found!!', 404))
  }

  let existingUser
  try {
    existingUser = await User.findOne({ email: decodedData.email })
  } catch (error) {
    next(new HttpError('Precap user not found!!', 404))
  }
  if (!existingUser) {
    next(new HttpError('Precap user not found!!', 404))
  }
  const bucketName = 'post_images'
  try {
    const uploadStream = await uploadFile((file = req.file), bucketName, null)
    uploadStream.on('finish', async () => {
      const fileId = uploadStream.id.toString()
      const timestamp = new Date().toISOString()
      const newPost = new Posts({
        issuerId: decodedData.email,
        image: fileId,
        links,
        content,
        timestamp
      })
      try {
        await newPost.save()
      } catch (err) {
        console.log(err)
        await deleteFile(fileId, bucketName)
        next(new HttpError('Post could not be saved', 500))
      }
      res.status(201).json({ data: 'New Post created!!' })
    })
    uploadStream.on('error', err => {
      throw err
    })
  } catch (err) {
    next(new HttpError("Post's image could not be saved", 500))
  }
}

const deletePosts = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    )
  }

  const { postId } = req.body
  const decodedData = res.decodedData
  if (!decodedData) {
    next(new HttpError('Precap user not found!!', 404))
  }

  let existingUser
  try {
    existingUser = await User.findOne({ email: decodedData.email })
  } catch (error) {
    next(new HttpError('Precap user not found!!', 404))
  }
  if (!existingUser) {
    next(new HttpError('Precap user not found!!', 404))
  }
  const bucketName = 'post_images'
  let existingPost
  try {
    existingPost = await Posts.findOne({ _id: postId })
  } catch (err) {
    next(new HttpError('Post could not be found!!', 404))
  }
  const imageId = existingPost.image.toString()

  try {
    existingPost = await Posts.deleteOne({ _id: postId })
  } catch (err) {
    next(new HttpError('Post could not be deleted!!', 404))
  }
  await deleteFile(imageId, bucketName)
  res
    .status(200)
    .json({ data: `Post with id ${postId} was successfully deleted!!` })
}

const getFileController = async (req, res, next) => {
  const { fileId, bucketName } = req.body
  try {
    await getFile(fileId, bucketName, res)
  } catch (err) {
    next(new HttpError('An error occurred while fetching the file', 500))
  }
}

exports.addPosts = addPosts
exports.userLogin = userLogin
exports.createAccount = createAccount
exports.newMessage = newMessage
exports.deletePosts = deletePosts
exports.getFile = getFileController
