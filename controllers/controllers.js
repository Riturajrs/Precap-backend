const { validationResult } = require('express-validator')
const HttpError = require('../models/http-error')
const Subscribers = require('../models/subscribers')
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const auth = require('../middleware/auth')
const { uploadFile, deleteFile, getFile } = require('../middleware/upload')
const Posts = require('../models/posts')
const Webinar = require('../models/webinar')

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

  const { content } = req.body
  let { links } = req.body
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
    next(new HttpError('Post could not be deleted!!', 500))
  }
  try{
  await deleteFile(imageId, bucketName)
  }
  catch(err){
    next(new HttpError("Post's images could not be deleted!!", 500))
  }
  res
    .status(200)
    .json({ data: `Post with id ${postId} was successfully deleted!!` })
}

const addWebinars = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    )
  }

  const { description, title, speakers, reg_link, timing, deadline } = req.body
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

  const bucketName_1 = 'webinar_icon_images'
  const bucketName_2 = 'webinar_bg_images'
  const icon_image = req.files.webinar_icon_image[0]
  const bg_image = req.files.webinar_bg_image[0]

  try {
    const uploadStream_icon = await uploadFile(
      (file = icon_image),
      bucketName_1,
      null
    )
    uploadStream_icon.on('finish', async () => {
      const fileId_icon = uploadStream_icon.id.toString()
      try {
        const uploadStream_bg = await uploadFile(
          (file = bg_image),
          bucketName_2,
          null
        )
        const fileId_bg = uploadStream_bg.id.toString()
        uploadStream_bg.on('finish', async () => {
          const timestamp = new Date().toISOString()
          const newWebinar = new Webinar({
            issuerId: decodedData.email,
            icon_image: fileId_icon,
            bg_image: fileId_bg,
            reg_link,
            description,
            title,
            speakers,
            timing,
            deadline,
            timestamp
          })
          try {
            await newWebinar.save()
          } catch (err) {
            console.log(err)
            await deleteFile(fileId_icon, bucketName_1)
            await deleteFile(fileId_bg, bucketName_2)
            next(new HttpError('Webinar could not be saved', 500))
          }
          res.status(201).json({ data: 'New Webinar created!!' })
        })
        uploadStream_bg.on('error', err => {
          throw err
        })
      } catch (err) {
        await deleteFile(fileId_icon, bucketName_1)
        next(new HttpError("Webinar's bg image could not be saved", 500))
      }
    })
    uploadStream_icon.on('error', err => {
      throw err
    })
  } catch (err) {
    next(new HttpError("Webinar's icon image could not be saved", 500))
  }
}

const deleteWebinars = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    )
  }

  const { webinarId } = req.body
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

  const bucketName_1 = 'webinar_icon_images'
  const bucketName_2 = 'webinar_bg_images'
  
  let existingWebinar
  
  try {
    existingWebinar = await Webinar.findOne({ _id: webinarId })
  } catch (err) {
    next(new HttpError('Webinar could not be found!!', 404))
  }
  const imageId_icon = existingWebinar.icon_image.toString()
  const imageId_bg = existingWebinar.bg_image.toString()

  try {
    existingWebinar = await Webinar.deleteOne({ _id: webinarId })
  } catch (err) {
    next(new HttpError('Webinar could not be deleted!!', 500))
  }
  try{
  await deleteFile(imageId_icon, bucketName_1)
  await deleteFile(imageId_bg, bucketName_2)
  }
  catch(err){
    next(new HttpError('Images in webinar could not be deleted!!', 500))
  }
  res
    .status(200)
    .json({ data: `Webinar with id ${webinarId} was successfully deleted!!` })

}

const getPosts = async(req,res,next) => {
  let allPosts
  try{
    allPosts = await Posts.find({})
  }
  catch(err){
    next(new HttpError('Posts could not be fetched', 500))
  }
  res.status(200).json({data: allPosts})
}

const getWebinars = async(req,res,next) => {
  let allWebinars
  try{
    allWebinars = await Webinar.find({})
  }
  catch(err){
    next(new HttpError('Webinars could not be fetched', 500))
  }
  res.status(200).json({data: allWebinars})
}

const getFileController = async (req, res, next) => {
  const { fileId, bucketName } = req.body
  try {
    await getFile(fileId, bucketName, res)
  } catch (err) {
    next(new HttpError('An error occurred while fetching the file', 500))
  }
}

exports.userLogin = userLogin
exports.createAccount = createAccount
exports.newMessage = newMessage
exports.addPosts = addPosts
exports.deletePosts = deletePosts
exports.addWebinars = addWebinars
exports.deleteWebinars = deleteWebinars
exports.getFile = getFileController
exports.getPosts = getPosts
exports.getWebinars = getWebinars